const { OpenAI } = require("openai");
const asyncHandler = require('express-async-handler');
const Accommodation = require("../models/Accommodation"); 
const Room = require("../models/Accommodation"); 
const Rating = require("../models/Accommodation"); 


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const askToGPT = asyncHandler(async (req, res) => {
    const { message } = req.body;

    // Classify intent questionnya
    const intentResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system", content: "You are an intent classifier for hotel-related queries."
            },
            {
                role: "user", content: `Classify the intent of this question: "${message}". Select one of these categories: ["recommendation", "comparison", "facilities", "price", "platform_info", "general"].`
            }
        ],
        max_tokens: 20,
        temperature: 0.3,
    });

    const intent = intentResponse.choices[0].message.content.toLowerCase().trim();
    console.log("Intent:", intent);

    if (intent === "recommendation") {
        // Mongodb
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system", content: "Extract structured data from hotel search queries."
                },
                {
                    role: "user", content: `From the following message, extract the budget, number of people, and accommodation location.\nMessage: "${message}"\nJSON Format: { "budget": ..., "people": ..., "location": ... }`
                }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const extractedData = JSON.parse(extractResponse.choices[0].message.content);
        const { budget, people, location } = extractedData;

        if (!budget || !people || !location) {
            return res.json({
                response: "I couldn't understand your request. Could you clarify?"
            });
        }

        const accommodations = await Accommodation.find({
            price: { $lte: budget },
            capacity: { $gte: people },
            location: location
        });

        if (accommodations.length === 0) {
            return res.json({
                response: `Sorry, there are no accommodations in ${location} within a budget of Rp${budget} for ${people} people.`
            });
        }

        const formattedData = accommodations.map(a =>
            `Name: ${a.name}, Location: ${a.location}, Price: ${a.price}, Capacity: ${a.capacity}, Description: ${a.description}`
        ).join("\n");

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a travel assistant that provides hotel recommendations." },
                {
                    role: "user", content: `Based on the following data, generate a recommendation for the user: \n${formattedData}`
                }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return res.json({ response: response.choices[0].message.content });

    } else if (intent === "comparison") {
        // compare mongodb
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract the hotel names from the following question." },
                { role: "user", content: `From this question: "${message}", extract the hotel names.\nJSON Format: { "hotels": ["Hotel Name 1", "Hotel Name 2"] }` }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const { hotels } = JSON.parse(extractResponse.choices[0].message.content);

        if (!hotels || hotels.length < 2) {
            return res.json({ response: "I'm sorry, but I couldn't identify multiple hotels to compare in your query. Could you please specify at least two hotels?" });
        }

        const accommodations = await Accommodation.find({ name: { $in: hotels } });

        if (accommodations.length < 2) {
            return res.json({ response: "I'm sorry, but I couldn't find sufficient information to compare the specified hotels." });
        }

        const formattedComparison = accommodations.map(a =>
            `Name: ${a.name}, Location: ${a.location}, Price: Rp${a.price}, Facilities: ${a.facilities}`
        ).join("\n");

        const comparisonResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a travel assistant that compares hotel accommodations." },
                { role: "user", content: `Based on the following data, provide a comparison for the user:\n${formattedComparison}` }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return res.json({ response: comparisonResponse.choices[0].message.content });

    } else if (intent === "facilities") {
        // Mongodb
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

        const accommodation = await Accommodation.findOne({ name: hotel });

        if (!accommodation) {
            return res.json({ response: `No information found for ${hotel}.` });
        }

        return res.json({ response: `Facilities of ${hotel}: ${accommodation.facilities}` });

    } else if (intent === "price") {
        // Harussnya extract mongoDB
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract the hotel name and room type from the question." },
                { role: "user", content: `From this question: "${message}", extract the hotel name and room type.\nJSON Format: { "hotel": "Hotel Name", "room_type": "Standard Room" }` }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const { hotel, room_type } = JSON.parse(extractResponse.choices[0].message.content);

        if (!hotel || !room_type) {
            return res.json({ response: "I couldn't understand which hotel or room type you meant. Could you clarify?" });
        }

        const accommodation = await Accommodation.findOne({ name: hotel });

        if (!accommodation || !accommodation.rooms[room_type]) {
            return res.json({ response: `No pricing information found for ${room_type} in ${hotel}.` });
        }

        return res.json({ response: `The price of ${room_type} at ${hotel} is Rp${accommodation.rooms[room_type].price}.` });


    } else if (intent === "platform_info") {

        // Ini buat handle dia cari info seputar Roomie
        const summaryUrl = 'https://raw.githubusercontent.com/yebology/roomie-summary/main/README.md';
        let summaryText = '';

        try {
            const response = await axios.get(summaryUrl);
            summaryText = response.data;
        } catch (error) {
            console.error('Error fetching Roomie summary:', error);
            return res.json({ response: "I couldn't retrieve the information about Roomie at the moment." });
        }

        // Jawab berdasar summary, kalo pertanyaaan nggak ada, ya 'I don't know'
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

    } else {
        // General
        const generalResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a travel expert specializing in accommodations." },
                { role: "user", content: message }
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        return res.json({ response: generalResponse.choices[0].message.content });
    }
});

module.exports = {
    askToGPT,
};
