
interface NotesSectionProps {
  notes?: string;
}

export const NotesSection = ({ notes }: NotesSectionProps) => {
  if (!notes || typeof notes !== 'string') {
    return null;
  }

  return (
    <section className="mt-8 p-6 bg-gray-50 rounded-lg">
      <p className="text-gray-600 text-lg leading-relaxed">{notes}</p>
    </section>
  );
};
