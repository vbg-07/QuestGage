import React, { useRef, useEffect, useState } from 'react';
import { s3, bucketName } from '../utils/aws-config';

const WebcamCapture = ({ currentConcept = "General" }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState("Initializing system...");
    const [lastUpload, setLastUpload] = useState(null);

    // Use a ref to track the CURRENT prop value inside the interval closure
    const conceptRef = useRef(currentConcept);

    useEffect(() => {
        conceptRef.current = currentConcept;
    }, [currentConcept]);

    useEffect(() => {
        // Start Webcam
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStatus("System Active: Monitoring Exam");
                }
            })
            .catch(err => {
                console.error("Webcam Error:", err);
                setStatus(`Error: ${err.message}`);
            });

        // Set up 2-minute timer (120,000 ms)
        // For testing, we can use a button, but requirements say "timer"
        const intervalId = setInterval(() => {
            captureAndUpload();
        }, 120000);

        return () => {
            clearInterval(intervalId);
            // Stop stream tracks
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const captureAndUpload = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const context = canvasRef.current.getContext('2d');
        const { videoWidth, videoHeight } = videoRef.current;

        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        // Draw frame
        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

        // Convert to Blob
        canvasRef.current.toBlob((blob) => {
            if (!blob) return;
            // Payload Strategy: Embed Concept in filename
            // Format: snapshot-{TIMESTAMP}-{CONCEPT}.jpg
            // Helper function to sanitize concept name
            const safeConcept = conceptRef.current.replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `snapshot-${Date.now()}-${safeConcept}.jpg`;
            uploadToS3(blob, fileName);
        }, 'image/jpeg');
    };

    const uploadToS3 = (blob, fileName) => {
        setStatus("Uploading snapshot...");

        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: blob,
            ContentType: 'image/jpeg'
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.error("Upload Error:", err);
                setStatus(`Upload Error: ${err.message}`);
            } else {
                console.log("Upload Success:", data);
                const time = new Date().toLocaleTimeString();
                setLastUpload(time);
                setStatus(`Monitoring Active. Last snapshot: ${time}`);
            }
        });
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '220px',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.9)' }}>
                <div style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    marginBottom: '0.8rem',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', display: 'block' }}
                    />
                    <div className="animate-pulse" style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'var(--danger)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                    }}>
                        REC
                    </div>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                    <p style={{ marginBottom: '2px' }}>{status}</p>
                    {lastUpload && <p style={{ margin: 0 }}>Last: {lastUpload}</p>}
                </div>

                <button
                    onClick={captureAndUpload}
                    className="btn-secondary"
                    style={{
                        width: '100%',
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                    }}
                >
                    Snap Now
                </button>

                {/* Hidden Canvas */}
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
        </div>
    );
};

export default WebcamCapture;
