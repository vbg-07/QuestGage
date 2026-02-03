import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { s3, bucketName } from '../utils/aws-config';
import { RateLimiter } from '../utils/rateLimit';

const WebcamCapture = ({ currentConcept = "General", studentId = "unknown" }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState("Initializing system...");
    const [lastUpload, setLastUpload] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Rate limiter: max 3 manual captures per minute
    const manualCaptureLimit = useMemo(() => new RateLimiter(3, 60000), []);

    // Use a ref to track the CURRENT prop value inside the interval closure
    const conceptRef = useRef(currentConcept);
    const studentIdRef = useRef(studentId);

    useEffect(() => {
        conceptRef.current = currentConcept;
    }, [currentConcept]);

    useEffect(() => {
        studentIdRef.current = studentId;
    }, [studentId]);

    useEffect(() => {
        let stream = null;

        // Start Webcam
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(mediaStream => {
                stream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStatus("Monitoring Active");
                }
            })
            .catch(err => {
                console.error("Webcam Error:", err);
                setStatus(`Error: ${err.message}`);
            });

        // Set up 2-minute timer (120,000 ms) for automatic captures
        const intervalId = setInterval(() => {
            captureAndUpload(false); // false = automatic capture (not manual)
        }, 120000);

        return () => {
            clearInterval(intervalId);
            // Stop stream tracks
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Cooldown timer effect
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const captureAndUpload = useCallback((isManual = true) => {
        if (!videoRef.current || !canvasRef.current) return;
        if (isUploading) return; // Prevent concurrent uploads

        const context = canvasRef.current.getContext('2d');
        const { videoWidth, videoHeight } = videoRef.current;

        if (videoWidth === 0 || videoHeight === 0) return;

        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        // Draw frame
        context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

        // Convert to Blob with quality optimization
        canvasRef.current.toBlob((blob) => {
            if (!blob) return;

            const safeConcept = conceptRef.current.replace(/[^a-zA-Z0-9]/g, '');
            const safeStudentId = studentIdRef.current.replace(/[^a-zA-Z0-9]/g, '') || 'unknown';
            const fileName = `snapshot-${Date.now()}-${safeStudentId}-${safeConcept}.jpg`;
            uploadToS3(blob, fileName);
        }, 'image/jpeg', 0.8); // 0.8 quality for smaller file size
    }, [isUploading]);

    const handleManualCapture = useCallback(() => {
        if (!manualCaptureLimit.isAllowed()) {
            const waitTime = manualCaptureLimit.getWaitTime();
            setCooldown(waitTime);
            setStatus(`Rate limited. Wait ${waitTime}s`);
            return;
        }
        captureAndUpload(true);
    }, [captureAndUpload, manualCaptureLimit]);

    const uploadToS3 = useCallback((blob, fileName) => {
        setIsUploading(true);
        setStatus("Uploading...");

        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: blob,
            ContentType: 'image/jpeg'
        };

        s3.upload(params, (err, data) => {
            setIsUploading(false);
            if (err) {
                console.error("Upload Error:", err);
                setStatus(`Error: ${err.code || 'Upload failed'}`);
            } else {
                const time = new Date().toLocaleTimeString();
                setLastUpload(time);
                setStatus(`Active • Last: ${time}`);
            }
        });
    }, []);

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '200px',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                padding: '0.75rem',
                textAlign: 'center',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.95)'
            }}>
                <div style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    marginBottom: '0.6rem',
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
                        top: '6px',
                        right: '6px',
                        background: 'var(--danger)',
                        color: 'white',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        fontSize: '0.55rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                    }}>
                        REC
                    </div>
                </div>

                <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.65rem',
                    marginBottom: '0.5rem',
                    minHeight: '1.2rem'
                }}>
                    {status}
                </div>

                <button
                    onClick={handleManualCapture}
                    className="btn-secondary"
                    disabled={isUploading || cooldown > 0}
                    style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '0.65rem',
                        opacity: (isUploading || cooldown > 0) ? 0.5 : 1,
                        cursor: (isUploading || cooldown > 0) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isUploading ? 'Uploading...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Snap Now'}
                </button>

                {/* Hidden Canvas */}
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
        </div>
    );
};

export default React.memo(WebcamCapture);
