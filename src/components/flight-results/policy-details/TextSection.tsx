
interface TextSectionProps {
  title: string;
  content?: string;
}

export const TextSection = ({ title, content }: TextSectionProps) => {
  if (!content) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xl font-semibold tracking-normal text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-700 text-lg leading-relaxed">{content}</p>
    </section>
  );
};
