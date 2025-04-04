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


const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",  // ตั้งค่า origin ให้ตรงกับที่ React ทำงาน
        methods: ["GET", "POST"]
    }
});
app.use(cors());
app.use(express.json());

// Database setup
mongoose.connect(process.env.DATABASE_URL)
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

        if (!url) {
            const shortUrl = nanoid(8);
            const myUrl = `http://localhost:5000/${shortUrl}`;
            const qrCodeImg = await QRCode.toDataURL(myUrl);

            url = new Url({ originalUrl, shortUrl, click: 0 });
            await url.save();
        }

        const myUrl = `http://localhost:5000/${url.shortUrl}`;
        const qrCodeImg = await QRCode.toDataURL(myUrl);
        const clickCount = url.click;

        return res.status(200).json({
            message: "Url Generated",
            shortUrl: myUrl,
            qrCodeImg,
            click: clickCount,
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




server.listen(5000, () => console.log("server is running on 5000"));
