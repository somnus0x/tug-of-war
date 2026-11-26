import './ended.css'

type SplitLineProps = {
  text: string
}

export const SplitLine = ({ text }: SplitLineProps) => <p className="split-line">{text}</p>
