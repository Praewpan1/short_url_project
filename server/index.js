import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const server = http.createServer(app);

const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = process.env.BASE_URL;

const allowedOrigins = [
    "https://short-url-project-ebon.vercel.app"
];
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
}));


app.use(express.json());

// Database setup
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("DB connected successfully"))
    .catch((err) => console.log("Failed to connect database", err));

const urlSchema = new mongoose.Schema({
    originalUrl: String,
    shortUrl: String,
    click: { type: Number, default: 0 },
});

const Url = mongoose.model('Url', urlSchema);

app.post('/api/short', async (req, res) => {
    try {
        const { originalUrl } = req.body;
        if (!originalUrl) return res.status(400).json({ error: 'originalUrl required' });

        let url = await Url.findOne({ originalUrl });

        if (url) {
            const myUrl = `${BASE_URL}/${url.shortUrl}`;
            const qrCodeImg = await QRCode.toDataURL(myUrl);
            return res.status(200).json({
                message: "Url Already Exists",
                shortUrl: myUrl,
                qrCodeImg,
                click: url.click,
            });
        }

        const shortUrl = nanoid(8);
        const cleanBase = BASE_URL.replace(/\/+$/, '');
        const myUrl = `${cleanBase}/${shortUrl}`;
        const qrCodeImg = await QRCode.toDataURL(myUrl);

        url = new Url({ originalUrl, shortUrl, click: 0 });
        await url.save();

        return res.status(200).json({
            message: "Url Generated",
            shortUrl: myUrl,
            qrCodeImg,
            click: 0,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server error" });
    }
});


app.get('/:shortUrl', async (req, res) => {
    try {
        const { shortUrl } = req.params;
        const url = await Url.findOne({ shortUrl });
        if (url) {
            url.click++;
            await url.save();


            io.emit('clickUpdate', { shortUrl, clicks: url.click });

            return res.redirect(url.originalUrl);
        } else {
            return res.status(404).json({ error: 'Short URL not found' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/', (req, res) => {
    res.send('✅ Short URL API is running!');
});

app.get('/api/history', async (req, res) => {
    try {
        const urls = await Url.find();
        return res.status(200).json(urls);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });
    }
});
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

