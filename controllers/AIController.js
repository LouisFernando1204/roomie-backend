const { OpenAI } = require("openai");

const asyncHandler = require('express-async-handler');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const askToGPT = asyncHandler(async (req, res) => {
    const { message } = req.body;

    // **Langkah 1: Deteksi intent pertanyaan**
    const intentResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system", content: "You are an intent classifier for hotel-related queries."
            },
            {
                role: "user", content: `Classify the intent of this question: "${message}". Select one of these categories: ["recommendation", "comparison", "facilities", "price", "general"].`
            }
        ],
        max_tokens: 20,
        temperature: 0.3,
    });

    const intent = intentResponse.choices[0].message.content.toLowerCase().trim();
    console.log("Intent:", intent);

    if (intent === "recommendation") {
        
        // **Langkah 2: Ekstrak informasi dari user**
        const extractResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system", content: "Extract structured data from hotel search queries."
                },
                {
                    role: "user", content: `From the following message, extract the budget, number of people, and accommodation location.\Message: "${message}"\nJSON Format: { "budget": ..., "people": ..., "location": ... }`
                }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const extractedData = JSON.parse(extractResponse.choices[0].message.content);
        const { budget, people, location } = extractedData;

        if (!budget || !people || !location) {
            return res.json({
                response: "Saya kurang memahami permintaan Anda. Bisa jelaskan lebih jelas?"
            });
        }

        // **Langkah 3: Query MongoDB**
        const accommodations = await Accommodation.find({
            price: { $lte: budget },
            capacity: { $gte: people },
            location: location
        });
        if (accommodations.length === 0) {
            return res.json({
                response: `Maaf, tidak ada penginapan di ${location} dengan budget Rp${budget} untuk ${people} orang.`
            });
        }

        const formattedData = accommodations.map(a =>
            `Nama: ${a.name}, Lokasi: ${a.location}, Harga: ${a.price}, Kapasitas: ${a.capacity}, Deskripsi: ${a.description} `
        ).join("\n");

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "system", content: "You are a travel assistant that provides hotel recommendations." },
                {
                    role: "user", content: `Berdasarkan data berikut, buat rekomendasi untuk pengguna: \n${formattedData} `
                }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });
        return res.json({ response: response.choices[0].message.content });
    }

    else if (intent === "perbandingan" || intent === "fasilitas" || intent === "harga") {

        // **Langkah 4: Query MongoDB untuk membandingkan fasilitas/harga**
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Extract the room types mentioned in the user's query." },
                { role: "user", content: `From this question: "${message}", ekstrak jenis kamar yang disebutkan.\nFormat JSON: { "room_types": ["deluxe", "premium"] } ` }
            ],
            max_tokens: 50,
            temperature: 0.5,
        });

        const { room_types } = JSON.parse(response.choices[0].message.content);

        if (!room_types || room_types.length === 0) {
            return res.json({ response: "Saya tidak menemukan tipe kamar dalam pertanyaan Anda." });
        }

        const accommodations = await Accommodation.find({ name: { $in: room_types } });
        if (accommodations.length === 0) {
            return res.json({ response: `Tidak ada informasi tentang kamar ${room_types.join(", ")}.` });
        }

        const formattedComparison = accommodations.map(a =>
            `Tipe: ${a.name}, Harga: Rp${a.price}, Fasilitas: ${a.description} `
        ).join("\n");
        const comparisonResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a travel assistant that compares hotel rooms." },
                { role: "user", content: `Berdasarkan data berikut, buat perbandingan kamar: \n${formattedComparison} ` }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });
        return res.json({ response: comparisonResponse.choices[0].message.content });
    }

    else {

        // **Langkah 5: Jika pertanyaan umum, gunakan GPT langsung tanpa query ke database**
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