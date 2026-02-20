import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { MouseEventHandler, ReactEventHandler } from "react";

interface ImgProps {
  src: string | StaticImport;
  alt: string;
  fill?: boolean;
  className?: string;
  height?: number | `${number}`;
  width?: number | `${number}`;
  objectFit?: string | undefined;
  sizes?: string;
  onClick?: MouseEventHandler<HTMLImageElement>;
  onError?: ReactEventHandler<HTMLImageElement> | undefined;
}

const Img = ({
  src,
  alt,
  fill,
  className = "",
  height,
  width,
  objectFit,
  sizes,
  onClick,
  onError,
}: ImgProps) => {
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={`${className} ${objectFit ? `object-${objectFit}` : ""}`}
      onError={onError}
      onClick={onClick}
      width={width}
      height={height}
      sizes={sizes}
    />
  );
};

export default Img;
