export type PlayPauseButtonState = "playing" | "paused";

export class PlayPauseButton {
  private el: HTMLButtonElement;
  private listeners: ((state?: PlayPauseButtonState) => any)[] = [];
  public state: PlayPauseButtonState;

  constructor(element: HTMLButtonElement) {
    this.el = element;
    this.el.addEventListener("click", () => {
      this.toggleState();
      for (const listener of this.listeners) {
        listener(this.state);
      }
    });
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.code === "Space") {
        if(document.activeElement === this.el){
          event.preventDefault();
          this.toggleState();
          for (const listener of this.listeners) {
            listener(this.state);
          }
        }
      }
    });
  }

  private toggleState(): void {
    if (this.state === "playing") {
      this.state = "paused";
      this.el.classList.remove("playing");
    } else {
      this.state = "playing";
      this.el.classList.add("playing");
    }
  }

  public listen(listener: (state?: PlayPauseButtonState) => any): void {
    this.listeners.push(listener);
  }

  public reset(): void {
    if (this.state === "playing") {
      this.state = "paused";
      this.el.classList.remove("playing");

      for (const listener of this.listeners) {
        listener(this.state);
      }
    }
  }
}
