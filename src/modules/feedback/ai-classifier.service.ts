import { Injectable } from '@nestjs/common';
import { log } from 'console';
import OpenAI from 'openai';

@Injectable()
export class AiClassifierService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async classifyFeedbackPreparate(
    feedback: string,
    empresas: any[],) {

    const cleanEmpresas = empresas.map((c) => ({
      _id: c._id,
      name: c.name,
      category: c.category,
    }));

    const prompt = `
            Eres un clasificador de feedbacks. 
            Recibirás un listado de empresas en JSON con _id, name y category. 
            Debes elegir SOLO una empresa cuya categoría coincida mejor con el feedback. 
            Si ninguna coincide, responde con null.

            Formato de respuesta: JSON válido, sin explicaciones ni bloques de código.

            Ejemplo:
            Feedback: "En mi barrio maltratan animales"
            Respuesta:
            { "empresaId": "68ccebb1ff0411a5bd8478ef", "name": "Unidad de Bienestar Animal (UBA)", "category": "bienestar_animal", "note": "Coincide con categoría bienestar_animal" }

            Empresas:
            ${JSON.stringify({ data: cleanEmpresas }, null, 2)}

            Feedback: "${feedback}"

            Responde:
            { "id": "<_idCompany>", "name": "<nameCompany>", "category": "<categoryCompany>", "note": "<explicacion>" }
            `;

    return await this.classifyFeedback(prompt);
  }

async classifyFeedback(prompt: string): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini", // o el modelo que prefieras
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    // 🔑 aquí extraes el texto de la IA
    const result = completion.choices[0].message?.content;

    try {
      log('AI raw response:',  JSON.parse(result!));
      // Si esperas JSON, intenta parsearlo directamente
      return JSON.parse(result!); 
    } catch (e) {
      // Si no es JSON válido, devuelve el texto crudo
      return { raw: result };
    }
  }
}
