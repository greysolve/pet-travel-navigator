
import { LucideIcon } from "lucide-react";

interface IconSectionProps {
  title: string;
  icon: LucideIcon;
  content?: string;
}

export const IconSection = ({ title, icon: Icon, content }: IconSectionProps) => {
  if (!content) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold tracking-normal text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-700 text-lg leading-relaxed">{content}</p>
    </section>
  );
};
