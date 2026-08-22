import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { BlockerSeverity } from '@prisma/client';

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY is not set. AI extraction will gracefully degrade (skip).',
      );
    }
  }

  /**
   * Menggunakan OpenAI untuk menganalisa blockerText.
   * Format expected dari LLM adalah JSON:
   * { "blockers": [ { "severity": "HIGH", "reason": "...", "action_plan": "..." } ] }
   *
   * Jika OpenAI belum diset, mengembalikan null agar tidak error.
   */
  async extractBlockers(
    blockerText: string,
  ): Promise<{ severity: BlockerSeverity; reason: string } | null> {
    if (!this.openai) return null;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Anda adalah AI asisten untuk daily standup. 
Tugas Anda adalah membaca teks hambatan (blocker) dari tim, kemudian mengekstrak masalah paling utama (SATU saja) ke dalam format JSON dengan skema berikut:
{
  "blocker": {
    "severity": "LOW" | "MEDIUM" | "HIGH",
    "reason": "Penjelasan singkat mengenai blocker utama"
  }
}
Gunakan 'HIGH' untuk blocker yang benar-benar menunda progres secara keseluruhan, 'MEDIUM' untuk perlambatan kerja, dan 'LOW' untuk hal minor. Jika teks tidak relevan dengan blocker, return {"blocker": null}. JAWAB HANYA DENGAN JSON MURNI TANPA MARKDOWN.`,
          },
          {
            role: 'user',
            content: blockerText,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return parsed.blocker || null;
    } catch (error) {
      this.logger.error(
        'Error saat memanggil OpenAI API',
        (error as Error).stack,
      );
      return null;
    }
  }

  /**
   * Menganalisa sekumpulan teks standup (dari berbagai user di satu workspace pada hari tertentu)
   * dan merangkumnya menjadi poin-poin eksekutif untuk manajer.
   */
  async generateDailySummary(standupsText: string): Promise<string | null> {
    if (!this.openai) return null;
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Anda adalah AI asisten manajer yang merangkum laporan daily standup tim. 
Diberikan kompilasi laporan hari ini. Buat ringkasan eksekutif sepanjang maksimal 3 paragraf. 
Fokus pada: 
1. Progres besar yang tercapai hari ini.
2. Area atau task yang sedang dalam masalah (blocker) jika ada. 
Gunakan bahasa yang profesional dan ringkas, jangan menyebut nama spesifik kecuali esensial.`,
          },
          {
            role: 'user',
            content: standupsText,
          },
        ],
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error(
        'Error saat memanggil OpenAI API (Daily Summary)',
        (error as Error).stack,
      );
      return null;
    }
  }

  /**
   * Menganalisa sekumpulan teks standup selama 7 hari terakhir.
   */
  async generateWeeklyDigest(standupsText: string): Promise<string | null> {
    if (!this.openai) return null;
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Anda adalah AI asisten manajer yang membuat rangkuman mingguan (weekly digest).
Diberikan kompilasi laporan standup tim selama seminggu terakhir. Buat ringkasan eksekutif sepanjang maksimal 4 paragraf.
Fokus pada: 
1. Pencapaian besar tim minggu ini.
2. Tren masalah (bottle neck) yang berulang kali muncul jika ada.
3. Kesimpulan produktivitas tim secara umum.
Gunakan bahasa yang profesional dan ringkas.`,
          },
          {
            role: 'user',
            content: standupsText,
          },
        ],
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error(
        'Error saat memanggil OpenAI API (Weekly Digest)',
        (error as Error).stack,
      );
      return null;
    }
  }
}
