import { CONFIG } from '@/constants/config';

interface AppStoreBadgeProps {
  className?: string;
}

export function AppStoreBadge({ className = '' }: AppStoreBadgeProps) {
  return (
    <a
      href={CONFIG.appStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block transition-transform hover:scale-105 ${className}`}
    >
      <svg
        viewBox="0 0 120 40"
        className="h-[40px] w-auto sm:h-[50px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="120" height="40" rx="6" fill="black" />
        <rect
          x="0.5"
          y="0.5"
          width="119"
          height="39"
          rx="5.5"
          stroke="white"
          strokeOpacity="0.3"
        />
        <path
          d="M24.769 20.3c-.025-2.717 2.217-4.029 2.319-4.092-1.264-1.849-3.232-2.103-3.932-2.131-1.67-.17-3.27 .987-4.12 .987-.852 0-2.163-.965-3.557-.939-1.826.027-3.516 1.067-4.458 2.706-1.906 3.306-.487 8.2 1.365 10.882.909 1.312 1.988 2.784 3.407 2.733 1.37-.055 1.888-.885 3.543-.885 1.654 0 2.122.885 3.565.855 1.474-.024 2.405-1.333 3.305-2.65 1.047-1.517 1.475-2.99 1.5-3.066-.033-.015-2.87-1.1-2.937-4.4z"
          fill="white"
        />
        <path
          d="M22.037 12.21c.752-.915 1.261-2.18 1.121-3.447-1.084.045-2.403.725-3.18 1.633-.697.81-1.309 2.106-1.146 3.345 1.211.093 2.449-.612 3.205-1.531z"
          fill="white"
        />
        <text
          fill="white"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="8"
          fontWeight="400"
        >
          <tspan x="35" y="14">
            Download on the
          </tspan>
        </text>
        <text
          fill="white"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="16"
          fontWeight="600"
        >
          <tspan x="35" y="30">
            App Store
          </tspan>
        </text>
      </svg>
    </a>
  );
}
