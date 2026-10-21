import React from "react";

export function CropFrame({ gap, className = "", style, children }) {
  return (
    <div className={["gw-crop-frame", className].filter(Boolean).join(" ")} style={{ ...(gap ? { "--gw-crop-gap": gap + "px" } : {}), ...style }}>
      <span className="gw-crop gw-crop--ts" aria-hidden="true" />
      <span className="gw-crop gw-crop--te" aria-hidden="true" />
      <span className="gw-crop gw-crop--bs" aria-hidden="true" />
      <span className="gw-crop gw-crop--be" aria-hidden="true" />
      {children}
    </div>
  );
}
