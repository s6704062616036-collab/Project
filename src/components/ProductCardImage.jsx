import React from "react";

const safeText = (value) => `${value ?? ""}`.trim();

export class ProductCardImage extends React.PureComponent {
  state = {
    imageFailed: false,
  };

  componentDidUpdate(prevProps) {
    if (safeText(prevProps.src) !== safeText(this.props.src) && this.state.imageFailed) {
      this.setState({ imageFailed: false });
    }
  }

  onError = () => {
    if (!this.state.imageFailed) {
      this.setState({ imageFailed: true });
    }
  };

  render() {
    const {
      src,
      alt,
      emptyLabel = "ไม่มีรูปภาพ",
      className = "h-full w-full object-cover",
      emptyClassName = "text-center text-xs text-zinc-400",
    } = this.props;
    const normalizedSrc = safeText(src);

    if (!normalizedSrc || this.state.imageFailed) {
      return <span className={emptyClassName}>{emptyLabel}</span>;
    }

    return <img src={normalizedSrc} alt={alt || "image"} className={className} onError={this.onError} />;
  }
}
