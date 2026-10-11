type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export default function Input({ label, ...rest }: Props) {
  return (
    <label className="block rounded-xl border border-gray-200 bg-white px-4 py-2 focus-within:border-brand">
      <span className="text-xs text-gray-500">{label}</span>
      <input className="mt-1 block w-full bg-transparent outline-none" {...rest} />
    </label>
  );
}
