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
                content: `Classify the intent of this question: "${message}". Select one of these categories: ["recommendation", "comparison", "facilities", "price", "platform_info", "common"]. 
                - recommendation if the user is looking for hotel suggestions.  
                - comparison if the user wants to compare hotels or accommodations.  
                - facilities if the user asks about available amenities in a hotel.  
                - price if the user asks about the cost of a hotel or a specific room type.  
                - platform_info if the user asks about Roomie's features, policies, or how it works, etc.  
                - common if the user asks about general travel topics (transportation, destinations, travel tips, visa requirements, tickets, or non-hotel-related recommendations).`
            }
        ],
        temperature: 0.1,
    });

    const intent = intentResponse.choices[0].message.content.toLowerCase().trim();
    console.log("Intent:", intent);

    const validIntents = ["recommendation", "comparison", "facilities", "price", "platform_info", "common"];
    if (!validIntents.includes(intent)) {
        console.log("OUT OF SCOPE!")
        console.log("INTENT: " + intent)

        const outOfScopeResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a polite assistant that informs users that you can only provide information about hotels available on Roomie." },
                { role: "user", content: `The user asked: "${message}". Respond by informing them that you can only provide details about hotels available on Roomie.` }
            ],
            temperature: 0.5,
        });

        return res.json({ response: outOfScopeResponse.choices[0].message.content });
    } else {
        if (intent === "recommendation") {
            console.log("RECOMMENDATION!");
            console.log("INTENT: " + intent);

            const extractResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Extract structured data from hotel search queries.
                        - Only include attributes that are explicitly mentioned in the query.
                        - Extract **only the core values** without extra words.
                        - Do **not** include category words like "name", "type", "address", "room", "description", "facilities", "price", "size", "max", "occupancy", etc.
                        - Return a JSON object with **only the pure values**.`
                    },
                    {
                        role: "user",
                        content: `Extract key attributes from this message: "${message}". 
                        Return a JSON object with **only the exact values** without unnecessary words.
                        
                        Example format:
                        {
                            "accommodationName": "...", 
                            "accommodationType": "...", 
                            "address": "...", 
                            "roomType": "...", 
                            "roomDescription": "...", 
                            "facilities": ["...", "..."], 
                            "price": ..., 
                            "bedSize": "...", 
                            "maxOccupancy": ...
                        }`
                    }
                ],
                temperature: 0.1,
            });


            const extractedData = JSON.parse(extractResponse.choices[0].message.content);
            console.log("Extracted Data: ", extractedData);

            const accommodationQuery = {};
            const roomQuery = {};

            const hasAccommodationData = extractedData.accommodationName || extractedData.accommodationType || extractedData.address;

            const hasRoomData = extractedData.roomType || extractedData.roomDescription || extractedData.facilities || extractedData.price || extractedData.bedSize || extractedData.maxOccupancy;

            if (extractedData.accommodationName) accommodationQuery.accommodationName = new RegExp(extractedData.accommodationName, 'i');
            if (extractedData.accommodationType) accommodationQuery.accommodationType = new RegExp(extractedData.accommodationType, 'i');
            if (extractedData.address) accommodationQuery.address = new RegExp(extractedData.address, 'i');

            if (extractedData.roomType) roomQuery.roomType = new RegExp(extractedData.roomType, 'i');
            if (extractedData.roomDescription) roomQuery.roomDescription = new RegExp(extractedData.roomDescription, 'i');
            if (extractedData.facilities) roomQuery.facilities = { $all: extractedData.facilities };
            if (extractedData.price) roomQuery.price = { $lte: extractedData.price };
            if (extractedData.bedSize) roomQuery.bedSize = new RegExp(extractedData.bedSize, 'i');
            if (extractedData.maxOccupancy) roomQuery.maxOccupancy = { $gte: extractedData.maxOccupancy };

            if (hasAccommodationData && !hasRoomData) {
                const accommodations = await Accommodation.find(accommodationQuery);
                console.log('Accommodations Only: ', accommodations);

                if (accommodations.length === 0) {
                    return res.json({ response: "Sorry, we couldn't find any accommodations that match your search." });
                }

                const formattedData = accommodations.map(acc =>
                    `🏨 *${acc.accommodationName}* (${acc.accommodationType})\n📍 *Location:* ${acc.address}`
                ).join("\n\n");

                const recommendationResponse = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: "You are a helpful travel assistant that provides hotel and room recommendations in a friendly and natural tone." },
                        { role: "user", content: `Based on the following data, generate a well-structured recommendation message:\n${formattedData}` }
                    ],
                    temperature: 0.3,
                });

                return res.json({ response: recommendationResponse.choices[0].message.content });
            }

            if (!hasAccommodationData && hasRoomData) {
                const rooms = await Room.find(roomQuery);
                console.log('Rooms Only: ', rooms);

                if (rooms.length === 0) {
                    return res.json({ response: "Sorry, we couldn't find any rooms that match your search." });
                }

                const accommodationIds = rooms.map(room => room.accommodationId).filter(id => id);
                const accommodations = await Accommodation.find({ _id: { $in: accommodationIds } });

                const formattedData = rooms.map(room => {
                    const acc = accommodations.find(a => a._id.equals(room.accommodationId));

                    if (!acc) {
                        console.warn(`Accommodation not found for room with ID: ${room._id}`);
                        return `🛏️ *Room Type:* ${room.roomType}\n📝 *Description:* ${room.roomDescription}\n🔹 *Facilities:* ${room.facilities.join(", ")}\n💰 *Price:* ${room.price.toLocaleString()} ETH\n🛏️ *Bed Size:* ${room.bedSize}\n👥 *Max Occupancy:* ${room.maxOccupancy} people\n\n❌ *Accommodation data not available*`;
                    }

                    return `🏨 *${acc.accommodationName}* (${acc.accommodationType})\n📍 *Location:* ${acc.address}\n🛏️ *Room Type:* ${room.roomType}\n📝 *Description:* ${room.roomDescription}\n🔹 *Facilities:* ${room.facilities.join(", ")}\n💰 *Price:* ${room.price.toLocaleString()} ETH\n🛏️ *Bed Size:* ${room.bedSize}\n👥 *Max Occupancy:* ${room.maxOccupancy} people`;
                }).join("\n\n");

                const recommendationResponse = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: "You are a helpful travel assistant that provides hotel and room recommendations in a friendly and natural tone." },
                        { role: "user", content: `Based on the following data, generate a well-structured recommendation message:\n${formattedData}` }
                    ],
                    temperature: 0.3,
                });

                return res.json({ response: recommendationResponse.choices[0].message.content });
            }

            const accommodations = await Accommodation.find(accommodationQuery);
            console.log('Accommodations: ', accommodations);

            if (accommodations.length === 0) {
                return res.json({ response: "Sorry, we couldn't find any hotels that match your search." });
            }

            let rooms = await Room.find({
                ...roomQuery,
                accommodationId: { $in: accommodations.map(a => a._id) }
            });
            console.log('Rooms: ', rooms);

            if (rooms.length === 0) {
                return res.json({ response: "We found a suitable hotel, but there are no rooms that match your search." });
            }

            const formattedData = rooms.map(room => {
                const acc = accommodations.find(a => a._id.equals(room.accommodationId));
                return `🏨 *${acc.accommodationName}* (${acc.accommodationType})\n📍 *Location:* ${acc.address}\n🛏️ *Bed Type:* ${room.roomType}\n📝 *Description:* ${room.roomDescription}\n🔹 *Facilities:* ${room.facilities.join(", ")}\n💰 *Price:* ${room.price.toLocaleString()} ETH\n🛏️ *Bed Size:* ${room.bedSize}\n👥 *Max Occupancy:* ${room.maxOccupancy} people`;
            }).join("\n\n");
            console.log('Formatted Data: ', formattedData);

            const recommendationResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful travel assistant that provides hotel and room recommendations in a friendly and natural tone." },
                    { role: "user", content: `Based on the following data, generate a well-structured recommendation message:\n${formattedData}` }
                ],
                temperature: 0.3,
            });

            return res.json({ response: recommendationResponse.choices[0].message.content });
        }
        else if (intent === "comparison") {
            console.log("COMPARISON!");
            console.log("INTENT: " + intent);

            const extractResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Extract structured hotel names for comparison queries.
                        - Extract only the core hotel names without extra words.
                        - Return JSON: { "hotels": ["Hotel Name 1", "Hotel Name 2"] }`
                    },
                    {
                        role: "user",
                        content: `Extract hotel names from this message: "${message}". Return only hotel names as an array.`
                    }
                ],
                temperature: 0.1,
            });

            const extractedData = JSON.parse(extractResponse.choices[0].message.content);
            console.log("Extracted Data: ", extractedData);

            if (!extractedData.hotels || extractedData.hotels.length < 2) {
                return res.json({ response: "Sorry, I couldn't identify multiple hotels to compare. Please specify at least two hotels." });
            }

            const accommodations = await Accommodation.find({ accommodationName: { $in: extractedData.hotels } });
            console.log("Accommodations: ", accommodations);

            if (accommodations.length < 2) {
                return res.json({ response: "Sorry, I couldn't find sufficient information to compare the specified hotels." });
            }

            const rooms = await Room.find({ accommodationId: { $in: accommodations.map(a => a._id) } });
            console.log("Rooms: ", rooms);

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
                `🏨 *${h.name}* (${h.type})\n📍 *Location:* ${h.address}\n💰 *Average Price:* ${h.avgPrice} ETH\n🔹 *Facilities:* ${h.facilities}`
            ).join("\n\n");

            const comparisonResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful travel assistant that compares hotels in a friendly and natural tone." },
                    { role: "user", content: `Based on the following data, generate a structured hotel comparison message:\n${formattedData}` }
                ],
                temperature: 0.3,
            });

            return res.json({ response: comparisonResponse.choices[0].message.content });
        }
        else if (intent === "facilities") {
            console.log("FACILITIES!");
            console.log("INTENT: " + intent);

            const extractResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Extract structured data from hotel facility inquiries.
                        - Extract **only the hotel name**.
                        - Return a JSON object with only the **hotel name**.`
                    },
                    {
                        role: "user",
                        content: `Extract the hotel name from this message: "${message}".
                        Return a JSON object in this format:
                        {
                            "accommodationName": "..."
                        }`
                    }
                ],
                temperature: 0.1,
            });

            const extractedData = JSON.parse(extractResponse.choices[0].message.content);
            console.log("Extracted Data: ", extractedData);

            if (!extractedData.accommodationName) {
                return res.json({ response: "I couldn't identify the hotel name in your query." });
            }

            const accommodation = await Accommodation.findOne({
                accommodationName: new RegExp(extractedData.accommodationName, 'i')
            });

            if (!accommodation) {
                return res.json({ response: `No information found for ${extractedData.accommodationName}.` });
            }

            const rooms = await Room.find({ accommodationId: accommodation._id });
            console.log('Rooms: ', rooms);

            if (rooms.length === 0) {
                return res.json({ response: `No room information found for ${extractedData.accommodationName}.` });
            }

            const allFacilities = [...new Set(rooms.flatMap(room => room.facilities))];
            console.log("All Facilities: ", allFacilities);

            if (allFacilities.length === 0) {
                return res.json({ response: `No facility information found for ${extractedData.accommodationName}.` });
            }

            const formattedFacilities = `🏨 *${extractedData.accommodationName}* Facilities:
        ${allFacilities.map(facility => `- ${facility}`).join("\n")}`;

            const facilitiesResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful travel assistant providing detailed and engaging information about hotel facilities in a friendly and natural tone." },
                    { role: "user", content: `Based on the following data, generate a structured hotel facilities message:\n${formattedFacilities}` }
                ],
                temperature: 0.3,
            });

            return res.json({ response: facilitiesResponse.choices[0].message.content });
        }
        if (intent === "price") {
            console.log("PRICE!");
            console.log("INTENT: " + intent);

            const extractResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Extract structured data from hotel price queries.
                        - Only extract attributes explicitly mentioned in the query.
                        - Extract **only core values** without extra words.
                        - Do **not** include category words like "name", "type", "room", "price", etc.
                        - Return a JSON object with **only the pure values**.`
                    },
                    {
                        role: "user",
                        content: `Extract key attributes from this message: "${message}".
                        Return a JSON object with **only the exact values** without unnecessary words.
                        
                        Example format:
                        {
                            "accommodationName": "...", 
                            "roomType": "..."
                        }`
                    }
                ],
                temperature: 0.1,
            });

            const extractedData = JSON.parse(extractResponse.choices[0].message.content);
            console.log("Extracted Data:", extractedData);

            if (!extractedData.accommodationName) {
                return res.json({ response: "I couldn't identify the hotel name in your query. Could you clarify?" });
            }

            const accommodation = await Accommodation.findOne({
                accommodationName: new RegExp(extractedData.accommodationName, 'i')
            });

            if (!accommodation) {
                return res.json({ response: `No pricing information found for ${extractedData.accommodationName}.` });
            }

            const roomQuery = { accommodationId: accommodation._id };
            if (extractedData.roomType) {
                roomQuery.roomType = new RegExp(extractedData.roomType, 'i');
            }

            const rooms = await Room.find(roomQuery);
            console.log("Rooms Found:", rooms);

            if (rooms.length === 0) {
                return res.json({ response: `No rooms found for ${extractedData.accommodationName}.` });
            }

            let formattedData;
            if (extractedData.roomType) {
                formattedData = rooms.map(room => `🏨 *${accommodation.accommodationName}*\n🛏️ *${room.roomType}*\n💰 *Price:* ${room.price.toLocaleString()} ETH`).join("\n\n");
            } else {
                const avgPrice = Math.round(rooms.reduce((sum, room) => sum + room.price, 0) / rooms.length);
                formattedData = `🏨 *${accommodation.accommodationName}*\n💰 *Average Room Price:* ${avgPrice.toLocaleString()} ETH`;
            }

            const gptResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful travel assistant providing hotel price information in a friendly and natural tone." },
                    { role: "user", content: `Based on the following data, generate a well-structured price response:\n${formattedData}` }
                ],
                temperature: 0.3,
            });

            return res.json({ response: gptResponse.choices[0].message.content });
        }
        else if (intent === "platform_info") {
            console.log("PLATFORM INFO!")
            console.log("INTENT: " + intent)

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
                temperature: 0.5,
            });

            const platformAnswer = platformResponse.choices[0].message.content.trim();

            if (platformAnswer.toLowerCase().includes("i don't know") || platformAnswer.toLowerCase().includes("i couldn't find")) {
                return res.json({ response: "I'm sorry, but I couldn't find the information you're looking for about Roomie. Could you please provide more details or ask another question?" });
            } else {
                return res.json({ response: platformAnswer });
            }
        }
        else if (intent === "common") {
            console.log("COMMON!");
            console.log("INTENT: " + intent);

            const commonResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a travel expert specializing in travel-related topics such as hotels, tickets, destinations, transportation, and travel tips. If a user asks about anything outside of travel, politely decline and redirect them to travel-related topics." },
                    { role: "user", content: message }
                ],
                temperature: 0.5,
            });

            return res.json({ response: commonResponse.choices[0].message.content });
        }
    }
});

module.exports = {
    askToGPT,
};