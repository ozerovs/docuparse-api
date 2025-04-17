declare module 'franc-min' {
    type FrancOptions = {
        minLength?: number;
        whitelist?: string[];
        blacklist?: string[];
    };

    export default function franc(
        text: string,
        options?: FrancOptions
    ): string;
} 