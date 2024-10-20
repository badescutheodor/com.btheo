import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

interface ImageCropperProps {
  imageSrc: string;
  crop: Crop;
  setCrop: React.Dispatch<React.SetStateAction<Crop>>;
  onCompletedCrop: (crop: PixelCrop) => void;
  setImageRef: (ref: HTMLImageElement | null) => void;
  maxWidth: number;
  maxHeight: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  crop,
  setCrop,
  onCompletedCrop,
  setImageRef,
  maxWidth,
  maxHeight,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [imgWidth, setImgWidth] = useState<number>(0);
  const [imgHeight, setImgHeight] = useState<number>(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setImgWidth(width);
      setImgHeight(height);

      const cropWidthPercentage = (maxWidth / width) * 100;
      const cropHeightPercentage = (maxHeight / height) * 100;
      const smallerPercentage = Math.min(
        cropWidthPercentage,
        cropHeightPercentage,
        20
      );

      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: smallerPercentage,
          },
          1,
          width,
          height
        ),
        width,
        height
      );

      setCrop(newCrop);
    },
    [maxWidth, maxHeight, setCrop]
  );

  const handleCropChange = (newCrop: Crop) => {
    setCrop(newCrop);
  };

  const handleCompletedCrop = (pixelCrop: PixelCrop) => {
    const scaledCrop: PixelCrop = {
      ...pixelCrop,
      x: Math.round(pixelCrop.x / zoom - pan.x),
      y: Math.round(pixelCrop.y / zoom - pan.y),
      width: Math.round(pixelCrop.width / zoom),
      height: Math.round(pixelCrop.height / zoom),
    };
    onCompletedCrop(scaledCrop);
  };

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

      const handleMouseMove = (e: MouseEvent) => {
        setPan({
          x: startPan.x + (e.clientX - startX) / zoom,
          y: startPan.y + (e.clientY - startY) / zoom,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [pan, zoom]
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

  // Set initial crop on component mount
  useEffect(() => {
    if (imgWidth && imgHeight) {
      const cropWidthPercentage = (maxWidth / imgWidth) * 100;
      const cropHeightPercentage = (maxHeight / imgHeight) * 100;
      const smallerPercentage = Math.min(
        cropWidthPercentage,
        cropHeightPercentage,
        20
      );

      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: smallerPercentage,
          },
          1,
          imgWidth,
          imgHeight
        ),
        imgWidth,
        imgHeight
      );

      setCrop(newCrop);
    }
  }, [imgWidth, imgHeight, maxWidth, maxHeight, setCrop]);

  return (
    <div
      ref={containerRef}
      style={{
        maxWidth: "100%",
        maxHeight: "400px",
        overflow: "hidden",
        cursor: "move",
      }}
      onMouseDown={handleMouseDown}
    >
      <ReactCrop
        crop={crop}
        onChange={handleCropChange}
        onComplete={handleCompletedCrop}
        aspect={1}
        minWidth={100}
        minHeight={100}
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
            transition: "transform 0.3s",
          }}
          onLoad={onImageLoad}
          draggable="false"
        />
      </ReactCrop>
    </div>
  );
};

export default ImageCropper;
