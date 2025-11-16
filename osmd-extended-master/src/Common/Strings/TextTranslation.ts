export class TextTranslation {
    public static DefaultTextTranslation: TextTranslation;
    public static translateText(tag: string, text: string): string {
        if (TextTranslation.DefaultTextTranslation === undefined) {
            return text;
        }
        return TextTranslation.DefaultTextTranslation.translate(tag, text);
    }
    public translate(tag: string, text: string): string {
        return text;
    }
}
