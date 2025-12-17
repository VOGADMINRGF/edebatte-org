
// Realer OpenAI-Aufruf (Images). Fallback: Platzhalter-Asset.
type GenOpts = { prompt: string; fallbackText?: string; aspectRatio?: "16:9"|"1:1"|"9:16" };
async function generateVOGImage({ prompt, fallbackText="VoiceOpenGov", aspectRatio="16:9" }: GenOpts): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "/dummy/vog-default.jpg";
  try {
    const size = aspectRatio==="1:1" ? "1024x1024" : aspectRatio==="9:16" ? "1024x1792" : "1792x1024";
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt: `${prompt}\nWasserzeichen: ${fallbackText}`, size })
    });
    const json:any = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return "/dummy/vog-default.jpg";
    // data URL zurückgeben – oder später in /public/ persistieren
    return `data:image/png;base64,${b64}`;
  } catch {
    return "/dummy/vog-default.jpg";
  }
}
export const youQuery = async (_: any)=>({ ok:false });


export default generateVOGImage;
export { generateVOGImage as generateVOGImageFn };