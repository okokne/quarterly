import { LucideIcon } from "lucide-react";

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
    return (
        <IconComponent
            size={size}
            strokeWidth={strokeWidth}
            className={className}
            aria-hidden="true"
            focusable="false"
        />
    );
}
