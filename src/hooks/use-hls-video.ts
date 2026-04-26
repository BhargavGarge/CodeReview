"use client";

import { useEffect, useRef } from "react";

export function useHLSVideo(
  videoRef: React.RefObject<HTMLVideoElement>,
  hlsUrl: string,
  fallbackUrl: string,
) {
  const hlsInstanceRef = useRef<any>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const setupVideo = async () => {
      try {
        // Check if HLS is supported
        if ((video as any).canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          video.src = hlsUrl;
        } else if (typeof window !== "undefined" && (window as any).Hls) {
          // Use HLS.js for other browsers
          const Hls = (window as any).Hls;

          if (Hls.isSupported()) {
            const hls = new Hls({
              debug: false,
              enableWorker: true,
              lowLatencyMode: true,
            });

            hlsInstanceRef.current = hls;

            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on("hlsManifestParsed", () => {
              video.play().catch((err) => {
                console.log("Autoplay failed:", err);
              });
            });

            hls.on("hlsError", (event: any, data: any) => {
              if (data.fatal) {
                console.warn("HLS fatal error, fallback to MP4");
                // Fallback to MP4
                video.src = fallbackUrl;
              }
            });
          } else {
            // Fallback to MP4
            video.src = fallbackUrl;
          }
        } else {
          // Fallback to MP4
          video.src = fallbackUrl;
        }
      } catch (error) {
        console.error("Error setting up video:", error);
        // Fallback to MP4
        if (video) {
          video.src = fallbackUrl;
        }
      }
    };

    setupVideo();

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
      }
    };
  }, [hlsUrl, fallbackUrl]);
}

// Load HLS.js from CDN if not available
if (typeof window !== "undefined" && !(window as any).Hls) {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
  document.head.appendChild(script);
}
