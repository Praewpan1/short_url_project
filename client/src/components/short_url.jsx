import axios from "axios";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./short_url_module.css";

const socket = io("http://localhost:5000");

export default function ShortUrl() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [history, setHistory] = useState([]);
  const [clicks, setClicks] = useState({});

  const fetchHistory = () => {
    axios
      .get("http://localhost:5000/api/history")
      .then((res) => {
        setHistory(res.data);
        const clicksData = {};
        res.data.forEach((urlItem) => {
          clicksData[urlItem.shortUrl] = urlItem.click;
        });
        setClicks(clicksData);
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    fetchHistory();

    socket.on("clickUpdate", (data) => {
      setClicks((prevClicks) => ({
        ...prevClicks,
        [data.shortUrl]: data.clicks,
      }));
    });

    return () => {
      socket.off("clickUpdate");
    };
  }, []);

  const handleSubmit = () => {
    if (!originalUrl.trim()) {
      alert("Please enter a valid URL.");
      return;
    }

    axios
      .post("http://localhost:5000/api/short", { originalUrl })
      .then((res) => {
        if (res.data && res.data.shortUrl) {
          setShortUrl(res.data.shortUrl);
          setQrCode(res.data.qrCodeImg);
        } else {
          alert("Short URL creation failed.");
        }
        setOriginalUrl("");
        fetchHistory();
      })
      .catch((err) => {
        console.error("Error shortening URL:", err);
        alert("Failed to shorten URL. Check console for details.");
      });
  };

  return (
    <div className="container">
      <h1>Paste the URL to be shortened</h1>

      <div className="input-container">
        <input
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          type="text"
          placeholder="Enter URL"
        />
        <button onClick={handleSubmit} type="button" className="shorten-btn">
          Shorten URL
        </button>
      </div>

      {shortUrl && (
        <div className="shortened-url">
          <p>Shortened URL:</p>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">
            {shortUrl}
          </a>
          <div className="qr-code">
            {qrCode && <img src={qrCode} alt="Generated QR Code" />}
          </div>
        </div>
      )}

      <div>
        <h2>URL History</h2>
        {history.length > 0 ? (
          <table className="history-table">
            <thead>
              <tr>
                <th>Original URL</th>
                <th>Short URL</th>
                <th>Click Count</th>
              </tr>
            </thead>
            <tbody>
              {history.map((urlItem, index) => (
                <tr key={index}>
                  <td>{urlItem.originalUrl}</td>
                  <td>
                    <a
                      href={`http://localhost:5000/${urlItem.shortUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {`http://localhost:5000/${urlItem.shortUrl}`}
                    </a>
                  </td>
                  <td className="clicks">{clicks[urlItem.shortUrl]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-history">No URL history found.</p>
        )}
      </div>
    </div>
  );
}
