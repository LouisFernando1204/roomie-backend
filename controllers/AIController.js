const { OpenAI } = require("openai");
const axios = require('axios');
const asyncHandler = require('express-async-handler');
const Accommodation = require("../models/Accommodation");
const Room = require("../models/Room");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const askToGPT = asyncHandler(async (req, res) => {
    const { message } = req.body;

    const intentResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are an intent classifier for Roomie, a platform specializing in hotel and accommodation bookings. Classify the user's query only based on Roomie's available services."
            },
            {
                role: "user",
                content: `Classify the intent of this question: "${message}". Select one of these categories: ["recommendation", "comparison", "facilities", "price", "platform_info", "general"]. 
                - "recommendation" if the user is looking for hotel suggestions.  
                - "comparison" if the user wants to compare hotels or accommodations.  
                - "facilities" if the user asks about available amenities in a hotel.  
                - "price" if the user asks about the cost of a hotel or a specific room type.  
                - "platform_info" if the user asks about Roomie's features, policies, or how it works, etc.  
                - "general" if the query is vague but still related to hotels in Roomie.`
            }
        ],
        max_tokens: 20,
        temperature: 0.3,
    });

    const intent = intentResponse.choices[0].message.content.toLowerCase().trim();
    console.log("Intent:", intent);

    if (intent === "recommendation") {
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract structured data from hotel search queries." },
                { role: "user", content: `Extract key attributes from this message: "${message}". Return JSON: { "accommodationName": ..., "accommodationType": ..., "address": ..., "roomType": ..., "roomDescription": ..., "facilities": ..., "price": ..., "bedSize": ..., "maxOccupancy": ... }` }
            ],
            max_tokens: 100,
            temperature: 0.5,
        });

        const extractedData = JSON.parse(extractResponse.choices[0].message.content);

        const accommodationQuery = {};
        if (extractedData.accommodationName) accommodationQuery.accommodationName = new RegExp(extractedData.accommodationName, 'i');
        if (extractedData.accommodationType) accommodationQuery.accommodationType = new RegExp(extractedData.accommodationType, 'i');
        if (extractedData.address) accommodationQuery.address = new RegExp(extractedData.address, 'i');

        const roomQuery = {};
        if (extractedData.roomType) roomQuery.roomType = new RegExp(extractedData.roomType, 'i');
        if (extractedData.roomDescription) roomQuery.roomDescription = new RegExp(extractedData.roomDescription, 'i');
        if (extractedData.facilities) roomQuery.facilities = { $all: extractedData.facilities };
        if (extractedData.price) roomQuery.price = { $lte: extractedData.price };
        if (extractedData.bedSize) roomQuery.bedSize = new RegExp(extractedData.bedSize, 'i');
        if (extractedData.maxOccupancy) roomQuery.maxOccupancy = { $gte: extractedData.maxOccupancy };

        const accommodations = await Accommodation.find(accommodationQuery);

        if (accommodations.length === 0) {
            return res.json({ response: "Sorry, we couldn't find any hotels that match your search." });
        }

        let rooms = await Room.find({
            ...roomQuery,
            accommodationId: { $in: accommodations.map(a => a._id) }
        });

        if (rooms.length === 0) {
            return res.json({ response: "We found a suitable hotel, but there are no rooms that match your search." });
        }

        const formattedData = rooms.map(room => {
            const acc = accommodations.find(a => a._id.equals(room.accommodationId));
            return `🏨 *${acc.accommodationName}* (${acc.accommodationType})\n📍 *Location:* ${acc.address}\n🛏️ *Bed Type:* ${room.roomType}\n📝 *Description:* ${room.roomDescription}\n🔹 *Facilities:* ${room.facilities.join(", ")}\n💰 *Price:* Rp${room.price.toLocaleString()}\n🛏️ *Bed Size:* ${room.bedSize}\n👥 *Max Occupancy:* ${room.maxOccupancy} people`;
        }).join("\n\n");

        const recommendationResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful travel assistant that provides hotel and room recommendations in a friendly and natural tone." },
                { role: "user", content: `Based on the following data, generate a well-structured recommendation message:\n${formattedData}` }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return res.json({ response: recommendationResponse.choices[0].message.content });
    } else if (intent === "comparison") {
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract structured hotel names for comparison queries." },
                { role: "user", content: `Extract hotel names from this message: "${message}". Return JSON: { "hotels": ["Hotel Name 1", "Hotel Name 2"] }` }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const { hotels } = JSON.parse(extractResponse.choices[0].message.content);

        if (!hotels || hotels.length < 2) {
            return res.json({ response: "Sorry, I couldn't identify multiple hotels to compare. Please specify at least two hotels." });
        }

        const accommodations = await Accommodation.find({ accommodationName: { $in: hotels } });

        if (accommodations.length < 2) {
            return res.json({ response: "Sorry, I couldn't find sufficient information to compare the specified hotels." });
        }

        const rooms = await Room.find({ accommodationId: { $in: accommodations.map(a => a._id) } });

        const hotelData = accommodations.map(acc => {
            const hotelRooms = rooms.filter(r => r.accommodationId.toString() === acc._id.toString());

            if (hotelRooms.length === 0) {
                return {
                    name: acc.accommodationName,
                    type: acc.accommodationType,
                    address: acc.address,
                    avgPrice: "No room data",
                    facilities: "No facility data"
                };
            }

            const avgPrice = Math.round(hotelRooms.reduce((sum, room) => sum + room.price, 0) / hotelRooms.length);

            const allFacilities = [...new Set(hotelRooms.flatMap(room => room.facilities))];

            return {
                name: acc.accommodationName,
                type: acc.accommodationType,
                address: acc.address,
                avgPrice: `Rp${avgPrice.toLocaleString()}`,
                facilities: allFacilities.join(", ")
            };
        });

        const formattedData = hotelData.map(h =>
            `🏨 *${h.name}* (${h.type})\n📍 *Location:* ${h.address}\n💰 *Average Price:* ${h.avgPrice}\n🔹 *Facilities:* ${h.facilities}`
        ).join("\n\n");

        const comparisonResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful travel assistant that compares hotels in a friendly and natural tone." },
                { role: "user", content: `Based on the following data, generate a structured hotel comparison message:\n${formattedData}` }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return res.json({ response: comparisonResponse.choices[0].message.content });
    } else if (intent === "facilities") {
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract the hotel name from the following question." },
                { role: "user", content: `From this question: "${message}", extract the hotel name.\nJSON Format: { "hotel": "Hotel Name" }` }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const { hotel } = JSON.parse(extractResponse.choices[0].message.content);

        if (!hotel) {
            return res.json({ response: "I couldn't identify the hotel name in your query." });
        }

        const accommodation = await Accommodation.findOne({ accommodationName: hotel });

        if (!accommodation) {
            return res.json({ response: `No information found for ${hotel}.` });
        }

        const rooms = await Room.find({ accommodationId: accommodation._id });

        if (rooms.length === 0) {
            return res.json({ response: `No room information found for ${hotel}.` });
        }

        const allFacilities = [...new Set(rooms.flatMap(room => room.facilities))];

        const facilitiesResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful travel assistant providing detailed and engaging information about hotel facilities in a friendly and natural tone." },
                { role: "user", content: `Based on the following data, generate a structured and informative response listing the facilities available at ${hotel}:\n\n🔹 *Facilities:*\n${allFacilities.map(facility => `- ${facility}`).join("\n")}` }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return res.json({ response: facilitiesResponse.choices[0].message.content });
    } else if (intent === "price") {
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract the hotel name and room type (if mentioned) from the question." },
                { role: "user", content: `From this question: "${message}", extract the hotel name and room type if available.\nJSON Format: { "hotel": "Hotel Name", "room_type": "Standard Room" (or null if not mentioned) }` }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const { hotel, room_type } = JSON.parse(extractResponse.choices[0].message.content);

        if (!hotel) {
            return res.json({ response: "I couldn't identify the hotel name in your query. Could you clarify?" });
        }

        const accommodation = await Accommodation.findOne({ accommodationName: hotel });

        if (!accommodation) {
            return res.json({ response: `No pricing information found for ${hotel}.` });
        }

        const rooms = await Room.find({ accommodationId: accommodation._id });

        if (rooms.length === 0) {
            return res.json({ response: `No rooms found for ${hotel}.` });
        }

        if (!room_type) {
            const avgPrice = Math.round(rooms.reduce((sum, room) => sum + room.price, 0) / rooms.length);

            const gptResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful travel assistant providing hotel price information in a friendly and natural tone." },
                    { role: "user", content: `Based on the following data, generate a natural response stating the average room price for ${hotel}. The average price is Rp${avgPrice}.` }
                ],
                max_tokens: 100,
                temperature: 0.7,
            });

            return res.json({ response: gptResponse.choices[0].message.content });
        } else {
            const specificRoom = rooms.find(room => room.roomType.toLowerCase() === room_type.toLowerCase());

            if (!specificRoom) {
                return res.json({ response: `No pricing information found for ${room_type} at ${hotel}.` });
            }

            const gptResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful travel assistant providing hotel room price information in a friendly and natural tone." },
                    { role: "user", content: `Based on the following data, generate a natural response stating the price of ${room_type} at ${hotel}. The price is Rp${specificRoom.price}.` }
                ],
                max_tokens: 100,
                temperature: 0.7,
            });

            return res.json({ response: gptResponse.choices[0].message.content });
        }
    } else if (intent === "platform_info") {
        const summaryUrl = 'https://raw.githubusercontent.com/yebology/roomie-summary/main/README.md';
        let summaryText = '';

        try {
            const response = await axios.get(summaryUrl);
            summaryText = response.data;
        } catch (error) {
            console.error('Error fetching Roomie summary:', error);
            return res.json({ response: "I couldn't retrieve the information about Roomie at the moment." });
        }

        const platformResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are an AI assistant knowledgeable about the Roomie platform." },
                { role: "user", content: `Based on the following summary, answer the question: "${message}"\n\n${summaryText}` }
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        const platformAnswer = platformResponse.choices[0].message.content.trim();

        if (platformAnswer.toLowerCase().includes("i don't know") || platformAnswer.toLowerCase().includes("i couldn't find")) {
            return res.json({ response: "I'm sorry, but I couldn't find the information you're looking for about Roomie. Could you please provide more details or ask another question?" });
        } else {
            return res.json({ response: platformAnswer });
        }
    } else if (intent === "general") {
        const generalResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a travel expert specializing in hotels listed under Roomie. If the question is about hotels outside Roomie, inform the user politely." },
                { role: "user", content: message }
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        return res.json({ response: generalResponse.choices[0].message.content });
    } else {
        const outOfScopeResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a polite assistant that informs users that you can only provide information about hotels available on Roomie." },
                { role: "user", content: `The user asked: "${message}". Respond by informing them that you can only provide details about hotels available on Roomie.` }
            ],
            max_tokens: 100,
            temperature: 0.7,
        });

        return res.json({ response: outOfScopeResponse.choices[0].message.content });
    }
});

module.exports = {
    askToGPT,
};