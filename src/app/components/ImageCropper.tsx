import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5; // Allow zooming out below 1x
const ZOOM_MAX = 3;

interface ImageCropperProps {
  imageSrc: string;
  onCompletedCrop: (crop: PixelCrop) => void;
  setImageRef: (ref: HTMLImageElement | null) => void;
  maxWidth: number;
  maxHeight: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCompletedCrop,
  setImageRef,
  maxWidth,
  maxHeight,
}) => {
  const [crop, setCrop] = useState<Crop | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [imgWidth, setImgWidth] = useState<number>(0);
  const [imgHeight, setImgHeight] = useState<number>(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false); // Track drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Calculate the centered crop box
  const setInitialCrop = useCallback(
    (width: number, height: number) => {
      const cropSize = Math.min(maxWidth, maxHeight); // Crop size will be the smaller of maxWidth or maxHeight
      const newCrop: Crop = {
        unit: "px",
        width: cropSize,
        height: cropSize,
        x: (width - cropSize) / 2, // Centering the crop box horizontally
        y: (height - cropSize) / 2, // Centering the crop box vertically
      };
      setCrop(newCrop);
    },
    [maxWidth, maxHeight]
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setImgWidth(width);
      setImgHeight(height);
      setInitialCrop(width, height); // Center the crop box after the image loads
    },
    [setInitialCrop]
  );

  const handleCropChange = (newCrop: Crop) => {
    setCrop(newCrop);
  };

  const handleCompletedCrop = useCallback(
    (pixelCrop: PixelCrop) => {
      if (!pixelCrop || !imageRef.current) return;

      const scaledCrop: PixelCrop = {
        ...pixelCrop,
        x: Math.round(pixelCrop.x / zoom - pan.x),
        y: Math.round(pixelCrop.y / zoom - pan.y),
        width: Math.round(pixelCrop.width / zoom),
        height: Math.round(pixelCrop.height / zoom),
      };
      onCompletedCrop(scaledCrop);
    },
    [zoom, pan, onCompletedCrop]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const newZoom = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, prevZoom - e.deltaY * 0.01)
        );
        const zoomPoint = { x: x / prevZoom, y: y / prevZoom };
        const newPan = {
          x: pan.x - zoomPoint.x * (newZoom - prevZoom),
          y: pan.y - zoomPoint.y * (newZoom - prevZoom),
        };
        setPan(newPan);
        return newZoom;
      });
    },
    [pan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const startX = e.clientX;
      const startY = e.clientY;
      const startPan = { ...pan };

      setIsDragging(true); // Start dragging

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          setPan({
            x: startPan.x + (e.clientX - startX) / zoom,
            y: startPan.y + (e.clientY - startY) / zoom,
          });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false); // End dragging
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [pan, zoom, isDragging]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [handleWheel]);

  // Ensure crop is set again after image loads
  useEffect(() => {
    if (imgWidth && imgHeight) {
      setInitialCrop(imgWidth, imgHeight);
    }
  }, [imgWidth, imgHeight, setInitialCrop]);

  return (
    <div
      ref={containerRef}
      style={{
        maxWidth: "100%",
        maxHeight: "400px",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "grab", // Update cursor when dragging
        backgroundColor: "#f0f0f0", // Background color when zooming out
      }}
      onMouseDown={handleMouseDown}
    >
      <ReactCrop
        crop={crop}
        onChange={handleCropChange}
        onComplete={handleCompletedCrop}
        aspect={1}
        keepSelection
        minWidth={maxWidth}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        minHeight={maxHeight}
        ruleOfThirds
      >
        <img
          ref={(ref) => {
            imageRef.current = ref;
            setImageRef(ref);
          }}
          alt="Crop me"
          src={imageSrc}
          style={{
            maxWidth: "none",
            maxHeight: "none",
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.3s", // Disable smooth transition while dragging
          }}
          onLoad={onImageLoad}
          draggable="false"
        />
      </ReactCrop>
    </div>
  );
};

export default ImageCropper;
