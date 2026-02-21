interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export default function SpreadComponent({ variant, ...props }: ButtonProps) {
  return <button className={`btn-${variant}`} {...props} />;
}
