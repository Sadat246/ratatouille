"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RequiredListingImageKind } from "@/lib/listings/shared";

type CameraCaptureModalProps = {
  imageKind: RequiredListingImageKind;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  slotTitle: string;
};

export function CameraCaptureModal({
  imageKind,
  isOpen,
  onClose,
  onCapture,
  slotTitle,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setError(null);
      setStarting(false);
      setCameraReady(false);
      return;
    }

    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not available in this browser.");
        return;
      }

      setStarting(true);
      setError(null);
      setCameraReady(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // play() can reject if interrupted; metadata may still load.
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.name === "NotAllowedError"
                ? "Camera permission was denied. Allow camera access to take a photo."
                : e.name === "NotFoundError"
                  ? "No camera was found on this device."
                  : e.message
              : "Could not start the camera.",
          );
        }
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, stopStream]);

  useLayoutEffect(() => {
    if (!isOpen || error) {
      return;
    }

    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => {
        /* play interrupted */
      });
    }
  }, [isOpen, error, starting]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stopStream();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, stopStream]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError("Camera is not ready yet. Wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not capture this photo. Try again.");
      return;
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not read the photo from the camera.");
          return;
        }
        const filename = `listing-${imageKind}-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: "image/jpeg" });
        stopStream();
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      aria-labelledby="camera-capture-title"
      aria-modal="true"
      role="dialog"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[2rem] border border-[#d7c8b5] bg-[#fff8f1] p-5 shadow-[0_24px_80px_rgba(45,33,19,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#1f261c]" id="camera-capture-title">
          {slotTitle}
        </h2>
        <p className="mt-1 text-sm text-[#5a4d3d]">Use your webcam, then take the shot.</p>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-[1.4rem] border border-white/80 bg-black">
          {error ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 bg-[#2a2420] px-4 text-center text-sm text-[#f0e8e0]">
              {error}
            </div>
          ) : (
            <>
              {/*
                Keep <video> mounted while starting so getUserMedia can attach srcObject
                to a real element (otherwise ref was null until after starting finished).
              */}
              <video
                ref={videoRef}
                autoPlay
                className="absolute inset-0 h-full w-full object-cover"
                muted
                onLoadedData={() => setCameraReady(true)}
                onPlaying={() => setCameraReady(true)}
                playsInline
              />
              {starting ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1814]/85 text-sm text-[#e8e0d8]">
                  Starting camera…
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#1f3d30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a5643] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={starting || Boolean(error) || !cameraReady}
            onClick={() => handleCapture()}
            type="button"
          >
            Take photo
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#c7d6cb] bg-white/90 px-4 py-3 text-sm font-semibold text-[#244534]"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
