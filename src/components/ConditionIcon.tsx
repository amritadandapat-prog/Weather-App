import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun,
  type LucideProps,
} from "lucide-react";
import type { Condition } from "@/lib/types";

export function ConditionIcon({ condition, ...props }: { condition: Condition } & LucideProps) {
  const { key, isDay } = condition;
  const common = { "aria-hidden": true, strokeWidth: 1.75, ...props };
  switch (key) {
    case "clear": return isDay ? <Sun {...common} /> : <Moon {...common} />;
    case "partly": return isDay ? <CloudSun {...common} /> : <CloudMoon {...common} />;
    case "drizzle": return <CloudDrizzle {...common} />;
    case "rain": return <CloudRain {...common} />;
    case "snow": return <CloudSnow {...common} />;
    case "storm": return <CloudLightning {...common} />;
    case "fog": return <CloudFog {...common} />;
    default: return <Cloud {...common} />;
  }
}
