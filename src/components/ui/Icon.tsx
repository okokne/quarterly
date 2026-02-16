import { IconWeight } from "@phosphor-icons/react";
import { LucideIcon } from "./icons";

type IconProps = {
    icon: LucideIcon;
    size?: number;
    strokeWidth?: number;
    className?: string;
};

export function Icon({
    icon: IconComponent,
    size = 18,
    strokeWidth = 1,
    className
}: IconProps) {
    const weight: IconWeight = strokeWidth <= 1
        ? "thin"
        : strokeWidth <= 1.5
            ? "light"
            : "regular";

    return (
        <IconComponent
            size={size}
            weight={weight}
            className={className}
            aria-hidden="true"
            focusable="false"
        />
    );
}
