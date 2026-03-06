import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

export interface SkillItem {
  slug: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  status: 'enabled' | 'disabled';
}

export interface SkillDetail extends SkillItem {
  doc: string;
}

interface OpenclawEntries {
  [slug: string]: { enabled?: boolean };
}

@Injectable()
export class SkillService {
  private readonly defaultSkillsPath = 'workspace/skills';

  constructor(private readonly configService: ConfigService) {}

  getSkillsPath(): string | null {
    const root = this.configService.get<string>('OPENCLAW_ROOT');
    if (!root?.trim()) return null;
    const skillsPath = this.configService.get<string>('OPENCLAW_SKILLS_PATH') ?? this.defaultSkillsPath;
    return path.join(root, skillsPath);
  }

  private getOpenclawJsonPath(): string | null {
    const root = this.configService.get<string>('OPENCLAW_ROOT');
    if (!root?.trim()) return null;
    return path.join(root, 'openclaw.json');
  }

  async loadOpenclawConfig(): Promise<OpenclawEntries> {
    const jsonPath = this.getOpenclawJsonPath();
    if (!jsonPath) return {};

    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(content) as { skills?: { entries?: OpenclawEntries } };
      return data?.skills?.entries ?? {};
    } catch {
      return {};
    }
  }

  private isDisabledByFolder(dirName: string): boolean {
    return dirName.endsWith('.disabled');
  }

  private getSlugFromDirName(dirName: string): string {
    return dirName.endsWith('.disabled') ? dirName.slice(0, -'.disabled'.length) : dirName;
  }

  private async isDisabled(slug: string, dirName: string, entries: OpenclawEntries): Promise<boolean> {
    if (this.isDisabledByFolder(dirName)) return true;
    const entry = entries[slug];
    if (entry && entry.enabled === false) return true;
    return false;
  }

  private async parseSkillMeta(skillDir: string, dirName: string): Promise<Omit<SkillItem, 'status'> | null> {
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    let skillMdContent: string;
    try {
      skillMdContent = await fs.readFile(skillMdPath, 'utf-8');
    } catch {
      return null;
    }

    const { data: frontmatter, content: _body } = matter(skillMdContent);
    const name = frontmatter?.name;
    const description = frontmatter?.description;
    if (!name || !description) return null;

    const slug = this.getSlugFromDirName(dirName);

    let version = '1.0.0';
    try {
      const metaPath = path.join(skillDir, '_meta.json');
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent) as { version?: string };
      if (meta?.version) version = meta.version;
    } catch {
      // use default version
    }

    let birthtime: Date;
    let mtime: Date;
    try {
      const stat = await fs.stat(skillMdPath);
      birthtime = stat.birthtime;
      mtime = stat.mtime;
    } catch {
      birthtime = new Date();
      mtime = new Date();
    }

    return {
      slug,
      name: String(name),
      description: String(description),
      version,
      createdAt: birthtime.toISOString(),
      updatedAt: mtime.toISOString(),
    };
  }

  async scanSkills(): Promise<SkillItem[]> {
    const skillsPath = this.getSkillsPath();
    if (!skillsPath) return [];

    let entries: string[];
    try {
      entries = await fs.readdir(skillsPath);
    } catch {
      return [];
    }

    const entriesConfig = await this.loadOpenclawConfig();
    const results: SkillItem[] = [];

    for (const entry of entries) {
      const fullPath = path.join(skillsPath, entry);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const meta = await this.parseSkillMeta(fullPath, entry);
      if (!meta) continue;

      const disabled = await this.isDisabled(meta.slug, entry, entriesConfig);
      const status: 'enabled' | 'disabled' = disabled ? 'disabled' : 'enabled';
      results.push({ ...meta, status });
    }

    return results.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  async getEnabledSkills(): Promise<SkillItem[]> {
    const all = await this.scanSkills();
    return all.filter((s) => s.status === 'enabled');
  }

  async getSkillBySlug(slug: string): Promise<SkillDetail | null> {
    const skillsPath = this.getSkillsPath();
    if (!skillsPath) return null;

    const entries = await fs.readdir(skillsPath).catch(() => []);
    const entriesConfig = await this.loadOpenclawConfig();

    for (const entry of entries) {
      const fullPath = path.join(skillsPath, entry);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const metaSlug = this.getSlugFromDirName(entry);
      if (metaSlug !== slug) continue;

      const meta = await this.parseSkillMeta(fullPath, entry);
      if (!meta) return null;

      const disabled = await this.isDisabled(slug, entry, entriesConfig);
      const status: 'enabled' | 'disabled' = disabled ? 'disabled' : 'enabled';

      const skillMdPath = path.join(fullPath, 'SKILL.md');
      const skillMdContent = await fs.readFile(skillMdPath, 'utf-8');
      const { content: doc } = matter(skillMdContent);

      return {
        ...meta,
        status,
        doc: doc.trim(),
      };
    }

    return null;
  }

  async getEnabledSkillBySlug(slug: string): Promise<SkillDetail | null> {
    const skill = await this.getSkillBySlug(slug);
    if (!skill || skill.status !== 'enabled') return null;
    return skill;
  }
}
