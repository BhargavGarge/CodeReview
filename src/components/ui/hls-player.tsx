"use client";

import React, { useEffect, useRef } from "react";
import HlsJs from "hls.js";

interface HLSPlayerProps {
  src: string;
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If HLS is supported by the browser and the source is an HLS stream
    if (src.includes(".m3u8") && HlsJs.isSupported()) {
      const hls = new HlsJs();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(HlsJs.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay might be blocked; user will need to interact
        });
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // HLS is natively supported (Safari)
      video.src = src;
      video.play().catch(() => {
        // Autoplay might be blocked
      });
    }
  }, [src]);

  return (
    <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        muted
        playsInline
      />
    </div>
  );
};

export default HLSPlayer;
