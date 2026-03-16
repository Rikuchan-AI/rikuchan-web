import { cn } from "@/lib/utils";

type ContainerProps = {
  className?: string;
  children: React.ReactNode;
};

export function Container({ className, children }: ContainerProps) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-10", className)}>{children}</div>;
}
