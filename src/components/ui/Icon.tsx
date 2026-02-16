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
    strokeWidth = 2,
    className
}: IconProps) {
    const resolvedSize = Math.max(1, size + 3);
    const weight: IconWeight = strokeWidth <= 1
        ? "thin"
        : strokeWidth <= 1.5
            ? "light"
            : strokeWidth <= 2.5
                ? "regular"
                : "bold";

    return (
        <IconComponent
            size={resolvedSize}
            weight={weight}
            className={className}
            aria-hidden="true"
            focusable="false"
        />
    );
}
