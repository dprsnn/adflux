"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const tips = [
  "ШІ аналізує сторінку товару та збирає ключову інформацію...",
  "Визначаємо цільову аудиторію та її болі...",
  "Формуємо унікальні торгові пропозиції...",
  "Генеруємо рекламні слогани та заклики до дії...",
  "Підбираємо ключові слова для таргетингу...",
  "Аналізуємо конкурентне середовище...",
  "Визначаємо емоційні тригери для реклами...",
  "Формуємо відповіді на типові заперечення...",
  "Майже готово — фінальна обробка даних...",
];

export function AnalysisLoader() {
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8 + 2;
      });
    }, 1000);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Animated spinner */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-primary" />
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(progress, 90)}%` }}
        />
      </div>

      {/* Tip text */}
      <p className="mt-4 min-h-[2.5rem] max-w-md text-center text-sm text-muted-foreground transition-opacity duration-500">
        {tips[tipIndex]}
      </p>
    </div>
  );
}
