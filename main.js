const { Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } = require("obsidian");

const LEGACY_MANAGED_PREFIXES = ["auto/", "ai/"];

const DEFAULT_RULES_TEXT = [
  "# 형식: 태그: 키워드1, 키워드2, 키워드3",
  "# 경로, 파일명, 본문을 함께 읽어 태그를 붙입니다.",
  "형식/편지: 13. 편지, 편지, 사랑하는, 보고 싶다, 어머니, 친구들, 공주님",
  "형식/계획: itinerary, 일정표, 여행 일정, 여행계획, 학습 계획, 실행 계획, 체크리스트, backlog, kanban, roadmap, 로드맵, 마일스톤, 커리큘럼, todo, to-do, 할 일",
  "형식/조사: 조사, 분석, 개요, 사업 구조, 성장 동인, 리스크 요인, 공통점, 종합 평가, 직무정리",
  "형식/기록: 후기, 깨달았습니다, 돌아보니, 느꼈습니다, 경험, 길 위에서",
  "주제/여행: 11. 여행, 여행, 배낭여행, trip, travel, itinerary, 숙소, 항공권, 공항, 출국, 입국",
  "여행/국내: 11. 여행/국내, 국내 여행, 국내여행, 서울 여행, 서울여행, 부산 여행, 부산여행, 제주 여행, 제주여행, 국내 숙소, 국내 항공권",
  "여행/국외: 11. 여행/국외, 국외 여행, 해외 여행, 해외여행, 해외 숙소, 해외 항공권, 배낭여행, 스리랑카, sri lanka, colombo, hikkaduwa, welligama, tissamaharama, ella, airport",
  "장소/서울: 서울",
  "장소/스리랑카: 스리랑카, sri lanka, colombo, hikkaduwa, welligama, tissamaharama, ella",
  "주제/관계: 지효, 공주님, 사랑, 보고 싶다, 친구, 어머니, 가족",
  "관계/가족: 어머니, 가족",
  "관계/친구: 친구, 친구들",
  "관계/연애: 지효, 공주님, 사랑, 보고 싶다",
  "주제/금융: 금융, 경제, 금리, 통화, 외환, 지급결제, 정책금융, 보험, 은행",
  "주제/투자: 투자, 기업, 산업, 실적, 밸류, 리스크, 성장 동인, wics, scm, 공급망, 물동량",
  "주제/진로: 33. 진로정리, 진로, 채용, 직무, 자소서, 취업, 공채, 경력",
  "진로/은행: 은행, 한국은행, 국민은행, 중앙은행, 시중은행",
  "진로/공공기관: 공기업, 공공기관, 한국무역보험공사, 한국해양진흥공사",
  "주제/코딩: 25. 코딩, 코드, python, javascript, git, 함수, api, cli, plugin, 플러그인, 디버깅, 테스트",
  "주제/인공지능: llm, 프롬프트, 토큰, rag, 생성형 ai, 생성형-ai, 생성형 인공지능, 인공지능, anthropic, openai, chatgpt, 챗gpt, claude, 클로드",
  "주제/독서: 22. 독서, 독서, 책, 독후감, 저자, 인용, 문학, 수학의 힘",
  "주제/봉사: 21. 봉사, 1365, 봉사, volunteer, 전공봉사단, 교육, 아이들",
  "주제/자격증: 34. 자격증, tesat, 투자자산운용사, 자격증",
  "주제/부업: 12. 노동 및 부업, 알바, 부업, 공모전, 상금, 지원금, 임상시험, 중고 판매, 선거",
  "주제/서비스기획: 앱인토스, 토스, 인앱, 포인트, 보상, 루프, 게임화, 사용자",
  "주제/에세이: 에세이, 코리아타임스",
  "주제/자기소개: 자소서, 자기소개"
].join("\n");

const DEFAULT_AI_CANDIDATE_TAGS_TEXT = [
  "형식/편지",
  "형식/계획",
  "형식/조사",
  "형식/기록",
  "주제/여행",
  "여행/국내",
  "여행/국외",
  "장소/서울",
  "장소/스리랑카",
  "주제/관계",
  "관계/가족",
  "관계/친구",
  "관계/연애",
  "주제/금융",
  "주제/투자",
  "주제/진로",
  "진로/은행",
  "진로/공공기관",
  "주제/코딩",
  "주제/인공지능",
  "주제/독서",
  "주제/봉사",
  "주제/자격증",
  "주제/부업",
  "주제/서비스기획",
  "주제/에세이",
  "주제/자기소개",
  "주제/자기성찰",
  "주제/성장"
].join("\n");

const DEFAULT_AI_CANDIDATE_SYSTEM_PROMPT = [
  "너는 개인 지식 창고의 노트를 태그하는 도우미다.",
  "반드시 허용된 태그 목록 안에서만 고른다.",
  "태그는 모두 한국어만 사용한다.",
  "단어 하나보다 노트 전체 문맥을 우선해서 판단한다.",
  "규칙 기반 힌트가 주어져도 오탐일 수 있으니 전체 문맥으로 검증한 뒤 맞는 태그만 남긴다.",
  "오프라인에서 관련 노트를 빨리 찾기 좋게 넓은 주제와 구체 태그를 함께 고른다.",
  "반환 형식은 반드시 JSON 하나로만 하고 형식은 {\"tags\":[\"태그1\",\"태그2\"]} 이다."
].join(" ");

const DEFAULT_AI_FREEFORM_SYSTEM_PROMPT = [
  "너는 개인 지식 창고의 노트를 읽고 태그를 만든다.",
  "태그는 모두 한국어만 사용한다.",
  "단어 하나보다 노트 전체 문맥을 우선해서 판단한다.",
  "규칙 기반 힌트가 주어져도 오탐일 수 있으니 전체 문맥으로 검증한 뒤 맞는 태그만 남긴다.",
  "태그는 오프라인에서 관련 노트를 다시 찾기 쉬워야 한다.",
  "너무 일반적인 태그보다, 나중에 같은 주제 노트를 잘 모아주는 태그를 만든다.",
  "필요하면 슬래시 계층 태그를 써도 된다. 예: 주제/여행, 관계/가족, 장소/서울",
  "본문에 'AI 해설' 같은 템플릿 문구가 있어도 노트 전체 주제가 AI가 아니면 AI 태그를 달지 않는다.",
  "날짜, 메모, 글 같은 쓸모없는 태그는 만들지 않는다.",
  "반환 형식은 반드시 JSON 하나로만 하고 형식은 {\"tags\":[\"태그1\",\"태그2\"]} 이다."
].join(" ");

const DEFAULT_SETTINGS = {
  enableOnSave: true,
  debounceMs: 1200,
  managedFieldName: "auto_content_tags_managed",
  managedAiFieldName: "auto_content_tags_ai",
  tagStateByPath: {},
  rulesText: "",
  aiEnabled: false,
  aiTagOnSave: false,
  aiTagMode: "freeform",
  aiBaseUrl: "https://api.openai.com/v1",
  aiApiKey: "",
  aiModel: "gpt-4o-mini",
  aiCandidateSystemPrompt: DEFAULT_AI_CANDIDATE_SYSTEM_PROMPT,
  aiFreeformSystemPrompt: DEFAULT_AI_FREEFORM_SYSTEM_PROMPT,
  aiCandidateTagsText: DEFAULT_AI_CANDIDATE_TAGS_TEXT,
  aiFinalAuthority: true,
  aiUseRuleHints: true,
  candidateAutoPromoteEnabled: true,
  candidateAutoPromoteThreshold: 3,
  maxTotalTags: 6,
  aiMaxTags: 6,
  aiMaxCharacters: 6000,
  aiMinContentLength: 120,
  aiCooldownMs: 300000,
  aiBatchDelayMs: 1200,
  aiRetryCount: 3,
  aiRetryBaseDelayMs: 1500
};

module.exports = class AutoContentTagsPlugin extends Plugin {
  async onload() {
    this.pendingTimers = new Map();
    this.processingPaths = new Set();
    this.suspendedUntil = new Map();
    this.aiFingerprints = new Map();
    this.aiLastRunAt = new Map();

    await this.loadSettings();

    this.addCommand({
      id: "tag-current-note",
      name: "Auto-tag current note",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice("Auto Content Tags: no active note.");
          return;
        }
        await this.tagFile(file, {
          includeRules: false,
          includeAi: true,
          suppressNotice: false,
          forceAi: true,
          reason: "manual-ai"
        });
      }
    });

    this.addCommand({
      id: "tag-all-notes",
      name: "Auto-tag all markdown notes",
      callback: async () => {
        await this.tagAllNotes({ includeRules: false, includeAi: true, forceAi: true, reason: "batch-ai" });
      }
    });

    this.addCommand({
      id: "ai-tag-current-note",
      name: "AI-tag current note",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice("Auto Content Tags: no active note.");
          return;
        }
        await this.tagFile(file, {
          includeRules: false,
          includeAi: true,
          suppressNotice: false,
          forceAi: true,
          reason: "manual-ai"
        });
      }
    });

    this.addCommand({
      id: "ai-tag-all-notes",
      name: "AI-tag all markdown notes",
      callback: async () => {
        await this.tagAllNotes({
          includeRules: false,
          includeAi: true,
          forceAi: true,
          reason: "batch-ai"
        });
      }
    });

    this.addSettingTab(new AutoContentTagsSettingTab(this.app, this));

    this.registerEvent(this.app.vault.on("modify", (file) => {
      this.handleVaultChange(file);
    }));

    this.registerEvent(this.app.vault.on("create", (file) => {
      this.handleVaultChange(file);
    }));
  }

  onunload() {
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
  }

  async loadSettings() {
    const merged = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    const migrated = migrateSettings(merged);
    this.settings = migrated.settings;
    const normalizedTagStateByPath = normalizeTagStateMap(this.settings.tagStateByPath);
    const normalizedStateChanged = !sameTagStateMap(this.settings.tagStateByPath, normalizedTagStateByPath);
    this.settings.tagStateByPath = normalizedTagStateByPath;
    if (migrated.changed || normalizedStateChanged) {
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  handleVaultChange(file) {
    if (!this.settings.enableOnSave || !this.isTaggableFile(file)) {
      return;
    }

    const suspendedUntil = this.suspendedUntil.get(file.path) || 0;
    if (Date.now() < suspendedUntil) {
      return;
    }

    this.queueFile(file, this.settings.debounceMs);
  }

  queueFile(file, waitMs) {
    const existingTimer = this.pendingTimers.get(file.path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(async () => {
      this.pendingTimers.delete(file.path);
      await this.tagFile(file, {
        includeRules: false,
        includeAi: this.settings.aiEnabled && this.settings.aiTagOnSave,
        suppressNotice: true,
        reason: "save"
      });
    }, Math.max(0, waitMs));

    this.pendingTimers.set(file.path, timer);
  }

  async tagAllNotes(options = {}) {
    const files = this.app.vault.getMarkdownFiles();
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    const includeAi = options.includeAi === true;

    for (const file of files) {
      const result = await this.tagFile(file, Object.assign({}, options, { suppressNotice: true }));
      if (result.error) {
        errors += 1;
      } else if (result.updated) {
        updated += 1;
      } else {
        unchanged += 1;
      }

      if (includeAi && this.settings.aiBatchDelayMs > 0) {
        await sleep(this.settings.aiBatchDelayMs);
      }
    }

    new Notice(`Auto Content Tags: ${updated} updated, ${unchanged} unchanged, ${errors} errors.`);
  }

  async tagFile(file, options = {}) {
    if (!this.isTaggableFile(file)) {
      return { updated: false };
    }

    const includeRules = options.includeRules !== false;
    const includeAi = options.includeAi === true;
    const rules = includeRules ? parseRulesText(this.settings.rulesText) : [];
    const aiCandidates = includeAi ? parseSimpleTagList(this.settings.aiCandidateTagsText) : [];

    if (this.processingPaths.has(file.path)) {
      return { updated: false };
    }

    this.processingPaths.add(file.path);

    try {
      const rawContent = await this.app.vault.cachedRead(file);
      const analysisText = buildAnalysisText(file, rawContent);
      const existingTags = this.getExistingTags(file);
      const existingManagedTags = this.getManagedTags(file);
      const existingAiTags = this.getStoredAiTags(file);
      const overrides = this.getOverrides(file);
      const manualTags = existingTags.filter((tag) => !existingManagedTags.includes(tag) && !isLegacyManagedTag(tag));

      const filteredManualTags = manualTags.filter((tag) => !overrides.exclude.includes(tag));
      const nextRuleTags = includeRules
        ? findMatchingTags(analysisText, rules)
        : existingManagedTags.filter((tag) => !existingAiTags.includes(tag));
      const filteredRuleTags = nextRuleTags.filter((tag) => !overrides.exclude.includes(tag) && !overrides.force.includes(tag));
      const aiResult = includeAi
        ? await this.generateAiTags(file, rawContent, analysisText, aiCandidates, existingAiTags, filteredRuleTags, options)
        : { tags: existingAiTags, skipped: true, reason: "not-requested" };
      const nextAiTags = includeAi ? aiResult.tags : existingAiTags;
      const filteredAiTags = nextAiTags.filter((tag) => !overrides.exclude.includes(tag) && !overrides.force.includes(tag));
      const automaticTags = shouldUseAiAsAuthority(includeAi, this.settings, aiResult)
        ? filteredAiTags
        : uniqueStrings([...filteredRuleTags, ...filteredAiTags]);
      const limited = limitTags(filteredManualTags, automaticTags, filteredAiTags, overrides.force, this.settings.maxTotalTags);
      const changed = await this.applyFinalTags(
        file,
        existingTags,
        existingManagedTags,
        existingAiTags,
        limited.finalTags,
        limited.includedManagedTags,
        limited.includedAiTags
      );

      if (changed) {
        this.suspendedUntil.set(file.path, Date.now() + Math.max(this.settings.debounceMs, 500));
      }

      let promotedCandidateTags = [];
      if (includeAi && !aiResult.error && nextAiTags.length) {
        promotedCandidateTags = await this.maybePromoteFrequentAiTags();
      }

      if (!options.suppressNotice) {
        const suffix =
          includeAi && aiResult.error
            ? `AI tagging failed${aiResult.message ? `: ${aiResult.message}` : ""}. Rule tags may still be updated.`
            : changed
              ? `updated ${file.basename}.`
              : `no changes for ${file.basename}.`;
        const promotionSuffix = promotedCandidateTags.length
          ? ` Promoted candidate tags: ${promotedCandidateTags.join(", ")}.`
          : "";
        new Notice(`Auto Content Tags: ${suffix}${promotionSuffix}`);
      }

      return {
        updated: changed,
        error: Boolean(aiResult.error),
        message: aiResult.message,
        ruleTags: nextRuleTags,
        aiTags: nextAiTags,
        managedTags: limited.includedManagedTags,
        storedAiTags: limited.includedAiTags,
        promotedCandidateTags
      };
    } catch (error) {
      console.error("Auto Content Tags failed", error);
      if (!options.suppressNotice) {
        new Notice(`Auto Content Tags: failed for ${file.basename}.`);
      }
      return { updated: false, error: true };
    } finally {
      this.processingPaths.delete(file.path);
    }
  }

  getExistingTags(file) {
    const fileCache = this.app.metadataCache.getFileCache(file);
    const frontmatterTags = fileCache && fileCache.frontmatter ? fileCache.frontmatter.tags : [];
    return normalizeTags(frontmatterTags);
  }

  getManagedTags(file) {
    const stored = this.getStoredTagState(file.path);
    if (stored.managedTags.length) {
      return stored.managedTags;
    }

    return this.getLegacyTagState(file).managedTags;
  }

  getStoredAiTags(file) {
    const stored = this.getStoredTagState(file.path);
    if (stored.aiTags.length) {
      return stored.aiTags;
    }

    return this.getLegacyTagState(file).aiTags;
  }

  getStoredTagState(filePath) {
    const stateMap = normalizeTagStateMap(this.settings.tagStateByPath);
    const entry = stateMap[filePath];
    if (!entry) {
      return { managedTags: [], aiTags: [] };
    }

    return {
      managedTags: normalizeTags(entry.managedTags).filter((tag) => !isLegacyManagedTag(tag)),
      aiTags: normalizeTags(entry.aiTags).filter((tag) => !isLegacyManagedTag(tag))
    };
  }

  getLegacyTagState(file) {
    const fileCache = this.app.metadataCache.getFileCache(file);
    const frontmatter = fileCache && fileCache.frontmatter ? fileCache.frontmatter : {};
    const managedFieldName = this.settings.managedFieldName || DEFAULT_SETTINGS.managedFieldName;
    const managedAiFieldName = this.settings.managedAiFieldName || DEFAULT_SETTINGS.managedAiFieldName;
    const managedTags = frontmatter ? frontmatter[managedFieldName] : [];
    const aiTags = frontmatter ? frontmatter[managedAiFieldName] : [];
    return {
      managedTags: normalizeTags(managedTags).filter((tag) => !isLegacyManagedTag(tag)),
      aiTags: normalizeTags(aiTags).filter((tag) => !isLegacyManagedTag(tag))
    };
  }

  hasLegacyStateFields(file) {
    const fileCache = this.app.metadataCache.getFileCache(file);
    const frontmatter = fileCache && fileCache.frontmatter ? fileCache.frontmatter : {};
    const managedFieldName = this.settings.managedFieldName || DEFAULT_SETTINGS.managedFieldName;
    const managedAiFieldName = this.settings.managedAiFieldName || DEFAULT_SETTINGS.managedAiFieldName;
    return Boolean(
      frontmatter &&
      (managedFieldName in frontmatter || managedAiFieldName in frontmatter)
    );
  }

  async persistTagState(filePath, nextManagedTags, nextAiTags) {
    const currentState = this.getStoredTagState(filePath);
    if (
      sameStringSet(currentState.managedTags, nextManagedTags) &&
      sameStringSet(currentState.aiTags, nextAiTags)
    ) {
      return false;
    }

    const stateMap = normalizeTagStateMap(this.settings.tagStateByPath);
    if (!nextManagedTags.length && !nextAiTags.length) {
      delete stateMap[filePath];
    } else {
      stateMap[filePath] = {
        managedTags: uniqueStrings(nextManagedTags),
        aiTags: uniqueStrings(nextAiTags)
      };
    }

    this.settings.tagStateByPath = stateMap;
    await this.saveSettings();
    return true;
  }

  async maybePromoteFrequentAiTags() {
    if (!this.settings.candidateAutoPromoteEnabled) {
      return [];
    }

    const threshold = Math.max(2, Number(this.settings.candidateAutoPromoteThreshold) || 3);
    const existingCandidates = parseSimpleTagList(this.settings.aiCandidateTagsText);
    const existingSet = new Set(existingCandidates);
    const counts = countAiTagOccurrencesByNote(this.settings.tagStateByPath);
    const promotedTags = Object.entries(counts)
      .filter(([tag, count]) => !existingSet.has(tag) && count >= threshold)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko"))
      .map(([tag]) => tag);

    if (!promotedTags.length) {
      return [];
    }

    this.settings.aiCandidateTagsText = uniqueStrings([...existingCandidates, ...promotedTags]).join("\n");
    await this.saveSettings();
    return promotedTags;
  }

  getOverrides(file) {
    const fileCache = this.app.metadataCache.getFileCache(file);
    const frontmatter = fileCache && fileCache.frontmatter ? fileCache.frontmatter : {};
    return {
      exclude: normalizeTags(frontmatter.auto_content_tags_exclude || []),
      force: normalizeTags(frontmatter.auto_content_tags_force || [])
    };
  }

  async applyFinalTags(file, existingTags, existingManagedTags, existingAiTags, nextTags, nextManagedTags, nextAiTags) {
    const managedFieldName = this.settings.managedFieldName || DEFAULT_SETTINGS.managedFieldName;
    const managedAiFieldName = this.settings.managedAiFieldName || DEFAULT_SETTINGS.managedAiFieldName;
    const storedState = this.getStoredTagState(file.path);
    const legacyFieldsPresent = this.hasLegacyStateFields(file);
    const frontmatterChanged = !sameStringSet(existingTags, nextTags) || legacyFieldsPresent;
    const stateChanged =
      !sameStringSet(storedState.managedTags, nextManagedTags) ||
      !sameStringSet(storedState.aiTags, nextAiTags);

    if (!frontmatterChanged && !stateChanged) {
      return false;
    }

    if (frontmatterChanged) {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (nextTags.length) {
          frontmatter.tags = nextTags;
        } else if ("tags" in frontmatter) {
          delete frontmatter.tags;
        }

        if (managedFieldName in frontmatter) {
          delete frontmatter[managedFieldName];
        }

        if (managedAiFieldName in frontmatter) {
          delete frontmatter[managedAiFieldName];
        }
      });
    }

    if (stateChanged) {
      await this.persistTagState(file.path, nextManagedTags, nextAiTags);
    }

    return true;
  }

  async generateAiTags(file, rawContent, analysisText, aiCandidates, existingAiTags, ruleHints, options) {
    if (!this.settings.aiEnabled) {
      return { tags: [], skipped: true, reason: "disabled" };
    }

    if (!this.hasAiConfig()) {
      return {
        tags: [],
        skipped: true,
        error: true,
        reason: "no-config",
        message: "AI settings are incomplete."
      };
    }

    const content = stripFrontmatter(rawContent).trim();
    if (content.length < this.settings.aiMinContentLength) {
      return { tags: [], skipped: true, reason: "too-short" };
    }

    const fingerprint = hashText(analysisText);
    const lastFingerprint = this.aiFingerprints.get(file.path);
    const lastRunAt = this.aiLastRunAt.get(file.path) || 0;
    const withinCooldown = Date.now() - lastRunAt < this.settings.aiCooldownMs;
    const isManualRun = options.forceAi === true || options.reason === "manual-ai" || options.reason === "batch-ai";

    if (!isManualRun && lastFingerprint === fingerprint) {
      return { tags: existingAiTags, skipped: true, reason: "unchanged" };
    }

    if (!isManualRun && options.reason === "save" && withinCooldown) {
      return { tags: existingAiTags, skipped: true, reason: "cooldown" };
    }

    try {
      const tags = await this.requestAiTags(file, content, aiCandidates, ruleHints);
      this.aiFingerprints.set(file.path, fingerprint);
      this.aiLastRunAt.set(file.path, Date.now());
      return { tags, skipped: false, reason: "success" };
    } catch (error) {
      console.error("Auto Content Tags AI request failed", error);
      const message = error && error.message ? String(error.message) : "unknown AI error";
      return {
        tags: existingAiTags,
        skipped: false,
        error: true,
        message,
        reason: "error"
      };
    }
  }

  async requestAiTags(file, content, aiCandidates, ruleHints) {
    const mode = this.settings.aiTagMode === "candidate" ? "candidate" : "freeform";
    const candidateTags = uniqueStrings(aiCandidates.map((tag) => normalizeTag(tag)));
    const hintTags = this.settings.aiUseRuleHints ? uniqueStrings(ruleHints.map((tag) => normalizeTag(tag))) : [];
    const truncatedContent = content.slice(0, this.settings.aiMaxCharacters);
    const systemPrompt = mode === "candidate"
      ? this.settings.aiCandidateSystemPrompt
      : this.settings.aiFreeformSystemPrompt;
    const payload = {
      model: this.settings.aiModel,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: mode === "candidate"
            ? buildAiCandidatePrompt(file, truncatedContent, candidateTags, this.settings.aiMaxTags, hintTags)
            : buildAiFreeformPrompt(file, truncatedContent, this.settings.aiMaxTags, hintTags)
        }
      ]
    };

    const baseUrl = String(this.settings.aiBaseUrl || "").replace(/\/+$/, "");
    const data = await this.requestAiJsonWithRetry(`${baseUrl}/chat/completions`, payload);
    const modelOutput = extractModelText(data);
    const parsed = parseJsonObject(modelOutput);
    const parsedTags = extractParsedTags(parsed);
    if (mode === "candidate") {
      const candidateMap = new Map(candidateTags.map((tag) => [normalizeTag(tag), tag]));
      const normalizedTags = parsedTags
        .map((tag) => normalizeTag(tag))
        .filter((tag) => candidateMap.has(tag))
        .map((tag) => candidateMap.get(tag));
      return uniqueStrings(normalizedTags).slice(0, this.settings.aiMaxTags);
    }

    const normalizedTags = parsedTags
      .map((tag) => normalizeGeneratedAiTag(tag))
      .filter(Boolean)
      .filter((tag) => !isLegacyManagedTag(tag));

    return uniqueStrings(normalizedTags).slice(0, this.settings.aiMaxTags);
  }

  hasAiConfig() {
    return Boolean(
      String(this.settings.aiBaseUrl || "").trim() &&
      String(this.settings.aiApiKey || "").trim() &&
      String(this.settings.aiModel || "").trim()
    );
  }

  isTaggableFile(file) {
    return file instanceof TFile && file.extension === "md";
  }

  async requestAiJsonWithRetry(url, payload) {
    const retryCount = Math.max(1, Number(this.settings.aiRetryCount) || 1);
    const baseDelay = Math.max(250, Number(this.settings.aiRetryBaseDelayMs) || 1500);
    let lastError = null;

    for (let attempt = 1; attempt <= retryCount; attempt += 1) {
      try {
        const response = await requestUrl({
          url,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.settings.aiApiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (response.status >= 200 && response.status < 300) {
          return response.json || JSON.parse(response.text);
        }

        const errorMessage = extractApiErrorMessage(response);
        const retryable = response.status === 429 || response.status >= 500;
        lastError = new Error(`HTTP ${response.status}${errorMessage ? ` - ${errorMessage}` : ""}`);

        if (!retryable || attempt === retryCount) {
          throw lastError;
        }
      } catch (error) {
        lastError = error;
        if (attempt === retryCount) {
          throw lastError;
        }
      }

      await sleep(baseDelay * attempt);
    }

    throw lastError || new Error("unknown AI request error");
  }
};

class AutoContentTagsSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h3", { text: "Automatic tagging" });

    new Setting(containerEl)
      .setName("Tag notes on save")
      .setDesc("When enabled, markdown notes are re-tagged each time they are saved.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableOnSave).onChange(async (value) => {
          this.plugin.settings.enableOnSave = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Debounce (ms)")
      .setDesc("Wait this long after a save event before re-tagging the note.")
      .addText((text) => {
        text
          .setPlaceholder("1200")
          .setValue(String(this.plugin.settings.debounceMs))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) {
              return;
            }
            this.plugin.settings.debounceMs = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Maximum tags per note")
      .setDesc("Manual tags are kept first, then automatic tags are added up to this limit.")
      .addText((text) => {
        text
          .setPlaceholder("6")
          .setValue(String(this.plugin.settings.maxTotalTags))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 1) {
              return;
            }
            this.plugin.settings.maxTotalTags = parsed;
            this.plugin.settings.aiMaxTags = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Tagging engine")
      .setDesc("This vault now runs in AI-only mode. Rule-based tagging is disabled, so only the AI decides automatic tags.");

    containerEl.createEl("h3", { text: "AI tagging" });

    new Setting(containerEl)
      .setName("Enable AI features")
      .setDesc("Turns on AI commands and settings. In this vault, AI is the only automatic tagging engine.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.aiEnabled).onChange(async (value) => {
          this.plugin.settings.aiEnabled = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("AI tag mode")
      .setDesc("`Freeform` lets AI invent Korean tags. `Candidate list` makes AI choose only from your Korean tag list.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("freeform", "Freeform")
          .addOption("candidate", "Candidate list")
          .setValue(this.plugin.settings.aiTagMode)
          .onChange(async (value) => {
            this.plugin.settings.aiTagMode = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI tag on save")
      .setDesc("Use AI on save. Keep this off unless you want network calls and token cost on save.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.aiTagOnSave).onChange(async (value) => {
          this.plugin.settings.aiTagOnSave = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("AI is the final judge")
      .setDesc("When AI succeeds, keep the AI result as the final automatic tags and treat rule tags as hints only.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.aiFinalAuthority).onChange(async (value) => {
          this.plugin.settings.aiFinalAuthority = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("AI base URL")
      .setDesc("OpenAI-compatible endpoint base URL, for example https://api.openai.com/v1")
      .addText((text) => {
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.aiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.aiBaseUrl = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI API key")
      .setDesc("Stored in the plugin data file on this machine.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.aiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.aiApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI model")
      .setDesc("Any model name supported by your OpenAI-compatible endpoint.")
      .addText((text) => {
        text
          .setPlaceholder("gpt-4o-mini")
          .setValue(this.plugin.settings.aiModel)
          .onChange(async (value) => {
            this.plugin.settings.aiModel = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI max tags")
      .setDesc("Upper bound for tags proposed by AI before the final per-note limit is applied.")
      .addText((text) => {
        text
          .setPlaceholder("4")
          .setValue(String(this.plugin.settings.aiMaxTags))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 1) {
              return;
            }
            this.plugin.settings.aiMaxTags = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI max characters")
      .setDesc("Only the first part of the note is sent to the model to keep requests bounded.")
      .addText((text) => {
        text
          .setPlaceholder("6000")
          .setValue(String(this.plugin.settings.aiMaxCharacters))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 200) {
              return;
            }
            this.plugin.settings.aiMaxCharacters = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI min content length")
      .setDesc("Notes shorter than this are skipped by AI tagging.")
      .addText((text) => {
        text
          .setPlaceholder("120")
          .setValue(String(this.plugin.settings.aiMinContentLength))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) {
              return;
            }
            this.plugin.settings.aiMinContentLength = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI save cooldown (ms)")
      .setDesc("Minimum time between automatic AI runs for the same note when saving.")
      .addText((text) => {
        text
          .setPlaceholder("300000")
          .setValue(String(this.plugin.settings.aiCooldownMs))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) {
              return;
            }
            this.plugin.settings.aiCooldownMs = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI batch delay (ms)")
      .setDesc("Wait between notes during `AI-tag all markdown notes` to reduce rate-limit errors.")
      .addText((text) => {
        text
          .setPlaceholder("1200")
          .setValue(String(this.plugin.settings.aiBatchDelayMs))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) {
              return;
            }
            this.plugin.settings.aiBatchDelayMs = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI retry count")
      .setDesc("How many times to retry on temporary API failures like 429 or 5xx.")
      .addText((text) => {
        text
          .setPlaceholder("3")
          .setValue(String(this.plugin.settings.aiRetryCount))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 1) {
              return;
            }
            this.plugin.settings.aiRetryCount = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI retry base delay (ms)")
      .setDesc("Initial wait before retrying. Later retries wait longer.")
      .addText((text) => {
        text
          .setPlaceholder("1500")
          .setValue(String(this.plugin.settings.aiRetryBaseDelayMs))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 100) {
              return;
            }
            this.plugin.settings.aiRetryBaseDelayMs = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI candidate tags")
      .setDesc("Used only in `Candidate list` mode. One allowed tag per line. Frequent new AI tags can be auto-added here.")
      .addTextArea((textArea) => {
        textArea.inputEl.rows = 16;
        textArea
          .setPlaceholder(DEFAULT_AI_CANDIDATE_TAGS_TEXT)
          .setValue(this.plugin.settings.aiCandidateTagsText)
          .onChange(async (value) => {
            this.plugin.settings.aiCandidateTagsText = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Auto-promote frequent AI tags")
      .setDesc("When a new AI-generated tag appears in enough different notes, add it to the candidate list automatically.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.candidateAutoPromoteEnabled).onChange(async (value) => {
          this.plugin.settings.candidateAutoPromoteEnabled = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Promotion threshold (notes)")
      .setDesc("How many different notes must contain a new AI tag before it is auto-added to the candidate list.")
      .addText((text) => {
        text
          .setPlaceholder("3")
          .setValue(String(this.plugin.settings.candidateAutoPromoteThreshold))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 2) {
              return;
            }
            this.plugin.settings.candidateAutoPromoteThreshold = parsed;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI candidate prompt")
      .setDesc("Advanced: used only in `Candidate list` mode.")
      .addTextArea((textArea) => {
        textArea.inputEl.rows = 6;
        textArea
          .setPlaceholder(DEFAULT_AI_CANDIDATE_SYSTEM_PROMPT)
          .setValue(this.plugin.settings.aiCandidateSystemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.aiCandidateSystemPrompt = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI freeform prompt")
      .setDesc("Advanced: used only in `Freeform` mode when AI invents tags by itself.")
      .addTextArea((textArea) => {
        textArea.inputEl.rows = 6;
        textArea
          .setPlaceholder(DEFAULT_AI_FREEFORM_SYSTEM_PROMPT)
          .setValue(this.plugin.settings.aiFreeformSystemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.aiFreeformSystemPrompt = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Restore default AI settings")
      .setDesc("Restore the bundled AI prompts and candidate tags.")
      .addButton((button) => {
        button.setButtonText("Restore").onClick(async () => {
          this.plugin.settings.aiCandidateSystemPrompt = DEFAULT_AI_CANDIDATE_SYSTEM_PROMPT;
          this.plugin.settings.aiFreeformSystemPrompt = DEFAULT_AI_FREEFORM_SYSTEM_PROMPT;
          this.plugin.settings.aiCandidateTagsText = DEFAULT_AI_CANDIDATE_TAGS_TEXT;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Auto Content Tags: default AI settings restored.");
        });
      });
  }
}

function parseRulesText(rulesText) {
  return String(rulesText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return null;
      }

      const tag = normalizeTag(line.slice(0, separatorIndex));
      const keywords = line
        .slice(separatorIndex + 1)
        .split(",")
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean);

      if (!tag || !keywords.length) {
        return null;
      }

      return { tag, keywords };
    })
    .filter(Boolean);
}

function parseSimpleTagList(value) {
  return uniqueStrings(
    String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => normalizeTag(line))
      .filter(Boolean)
  );
}

function buildAnalysisText(file, rawContent) {
  return [
    `path: ${file.path}`,
    `name: ${file.basename}`,
    stripFrontmatter(rawContent)
  ].join("\n");
}

function buildAiCandidatePrompt(file, content, candidateTags, maxTags, ruleHints) {
  return [
    `파일 경로: ${file.path}`,
    `파일 이름: ${file.basename}`,
    `${maxTags}개 이하의 태그를 허용 목록에서만 고른다.`,
    ...buildRuleHintLines(ruleHints),
    "허용 태그 목록:",
    ...candidateTags.map((tag) => `- ${tag}`),
    "",
    "노트 내용:",
    content
  ].join("\n");
}

function buildAiFreeformPrompt(file, content, maxTags, ruleHints) {
  return [
    `파일 경로: ${file.path}`,
    `파일 이름: ${file.basename}`,
    `이 노트에 어울리는 태그를 ${maxTags}개 이하로 만든다.`,
    ...buildRuleHintLines(ruleHints),
    "규칙:",
    "- 태그는 반드시 한국어만 사용한다",
    "- 단어 하나보다 노트 전체 문맥을 우선해서 판단한다",
    "- 규칙 기반 힌트가 틀릴 수 있으니 전체 문맥으로 검증한 뒤 필요한 것만 남긴다",
    "- 관련 노트를 다시 찾기 쉬운 태그를 만든다",
    "- 필요하면 형식/편지, 장소/서울 같은 슬래시 태그를 써도 된다",
    "- 'AI 해설' 같은 템플릿 머리말만 보고 AI 관련 태그를 만들지 않는다",
    "- 날짜, 메모, 글 같은 일반적인 태그는 만들지 않는다",
    "- 너무 길게 쓰지 않는다",
    "",
    "노트 내용:",
    content
  ].join("\n");
}

function buildRuleHintLines(ruleHints) {
  const normalizedHints = uniqueStrings((ruleHints || []).map((tag) => normalizeTag(tag)).filter(Boolean));
  if (!normalizedHints.length) {
    return [
      "규칙 기반 힌트:",
      "- 없음",
      ""
    ];
  }

  return [
    "규칙 기반 힌트(오탐일 수 있으니 전체 문맥으로 검증한다):",
    ...normalizedHints.map((tag) => `- ${tag}`),
    ""
  ];
}

function findMatchingTags(content, rules) {
  const normalizedContent = String(content || "").toLowerCase();
  const matchedTags = [];

  for (const rule of rules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      score += countKeywordMatches(normalizedContent, keyword);
    }

    if (score > 0) {
      matchedTags.push(rule.tag);
    }
  }

  return uniqueStrings(matchedTags);
}

function countKeywordMatches(content, keyword) {
  if (!keyword) {
    return 0;
  }

  if (usesAsciiWordBoundaries(keyword)) {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "gi");
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  if (usesHangulBoundaryMatching(keyword)) {
    const matches = content.match(buildHangulKeywordRegex(keyword));
    return matches ? matches.length : 0;
  }

  return content.includes(keyword) ? 1 : 0;
}

function usesAsciiWordBoundaries(keyword) {
  return /^[a-z0-9/_-]+$/i.test(keyword) && keyword.length >= 2;
}

function usesHangulBoundaryMatching(keyword) {
  return /[가-힣]/.test(keyword);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHangulKeywordRegex(keyword) {
  const escaped = escapeRegExp(keyword);
  return new RegExp(`(^|[^가-힣a-z0-9])(${escaped})(?=$|[^가-힣a-z0-9]|${buildHangulParticlePattern()})`, "giu");
}

function buildHangulParticlePattern() {
  return "(은|는|이|가|을|를|의|에|에서|에게|께|한테|와|과|도|만|로|으로|랑|이나|나|처럼|보다|부터|까지|마저|조차|라도|야|요|죠|입니다|이다)";
}

function stripFrontmatter(content) {
  const normalized = String(content || "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return normalized;
  }

  const endIndex = normalized.indexOf("\n---", 4);
  if (endIndex === -1) {
    return normalized;
  }

  return normalized.slice(endIndex + 4).trimStart();
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => normalizeTag(item)).filter(Boolean));
  }

  if (typeof value === "string") {
    return uniqueStrings(
      value
        .split(",")
        .map((item) => normalizeTag(item))
        .filter(Boolean)
    );
  }

  return [];
}

function normalizeTag(value) {
  return String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function normalizeGeneratedAiTag(value) {
  let tag = normalizeTag(value);
  if (!tag) {
    return "";
  }

  return normalizeTag(tag);
}

function extractModelText(data) {
  const choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
  const message = choice && choice.message ? choice.message : null;
  const content = message ? message.content : "";

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("\n");
  }

  return typeof content === "string" ? content : "";
}

function parseJsonObject(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return { tags: [] };
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw error;
    }
    return JSON.parse(match[0]);
  }
}

function extractParsedTags(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  if (Array.isArray(parsed.tags)) {
    return parsed.tags;
  }

  if (Array.isArray(parsed.태그)) {
    return parsed.태그;
  }

  if (Array.isArray(parsed.tag)) {
    return parsed.tag;
  }

  return [];
}

function extractApiErrorMessage(response) {
  try {
    const data = response.json || JSON.parse(response.text);
    if (data && data.error && typeof data.error.message === "string") {
      return data.error.message;
    }
  } catch (error) {
    return "";
  }
  return "";
}

function limitTags(manualTags, automaticTags, aiTags, forcedTags, maxTotalTags) {
  const finalTags = [];
  const includedManagedTags = [];
  const includedAiTags = [];
  const seen = new Set();
  const aiTagSet = new Set(uniqueStrings(aiTags));

  function pushTag(tag, managed) {
    if (finalTags.length >= maxTotalTags || seen.has(tag)) {
      return;
    }

    seen.add(tag);
    finalTags.push(tag);

    if (managed) {
      includedManagedTags.push(tag);
      if (aiTagSet.has(tag)) {
        includedAiTags.push(tag);
      }
    }
  }

  for (const tag of uniqueStrings(forcedTags)) {
    if (finalTags.length >= maxTotalTags) {
      break;
    }
    pushTag(tag, true);
  }

  for (const tag of uniqueStrings(manualTags)) {
    if (finalTags.length >= maxTotalTags) {
      break;
    }
    pushTag(tag, false);
  }

  for (const tag of uniqueStrings(automaticTags)) {
    if (finalTags.length >= maxTotalTags) {
      break;
    }
    pushTag(tag, true);
  }

  return { finalTags, includedManagedTags, includedAiTags };
}

function shouldUseAiAsAuthority(includeAi, settings, aiResult) {
  if (!includeAi || !settings.aiEnabled || !settings.aiFinalAuthority) {
    return false;
  }

  if (!aiResult || aiResult.error) {
    return false;
  }

  return aiResult.reason === "success" || aiResult.reason === "unchanged";
}

function isLegacyManagedTag(tag) {
  const normalizedTag = normalizeTag(tag);
  return LEGACY_MANAGED_PREFIXES.some((prefix) => normalizedTag.startsWith(prefix));
}

function migrateSettings(settings) {
  const next = Object.assign({}, settings);
  let changed = false;

  if (!next.managedFieldName) {
    next.managedFieldName = DEFAULT_SETTINGS.managedFieldName;
    changed = true;
  }

  if (!next.managedAiFieldName) {
    next.managedAiFieldName = DEFAULT_SETTINGS.managedAiFieldName;
    changed = true;
  }

  if (!next.tagStateByPath || typeof next.tagStateByPath !== "object" || Array.isArray(next.tagStateByPath)) {
    next.tagStateByPath = {};
    changed = true;
  }

  if (!next.maxTotalTags || Number(next.maxTotalTags) !== 6) {
    next.maxTotalTags = 6;
    changed = true;
  }

  if (!next.aiMaxTags || Number(next.aiMaxTags) !== 6) {
    next.aiMaxTags = 6;
    changed = true;
  }

  if (
    next.rulesText == null ||
    String(next.rulesText).includes("auto/source/inbox") ||
    String(next.rulesText).includes("형식/계획: 계획, itinerary, 일정, backlog, kanban, 목표, 커리큘럼, 프로젝트") ||
    String(next.rulesText).includes("여행/국내: 국내, 서울 여행, 서울") ||
    String(next.rulesText).includes("진로/공공기관: 공기업, 공사, 한국무역보험공사, 한국해양진흥공사") ||
    String(next.rulesText).includes("주제/인공지능: ai, llm, 프롬프트, 토큰, rag, 모델, 생성형, 인공지능, anthropic, openai")
  ) {
    next.rulesText = "";
    changed = true;
  }

  if (next.aiCandidateTagsText == null || String(next.aiCandidateTagsText).includes("ai/form/letter")) {
    next.aiCandidateTagsText = DEFAULT_AI_CANDIDATE_TAGS_TEXT;
    changed = true;
  }

  if (!next.aiCandidateSystemPrompt || String(next.aiCandidateSystemPrompt).includes("Pick only durable tags from the allowed list")) {
    next.aiCandidateSystemPrompt = DEFAULT_AI_CANDIDATE_SYSTEM_PROMPT;
    changed = true;
  }

  if (!next.aiFreeformSystemPrompt || String(next.aiFreeformSystemPrompt).includes("Return only lowercase kebab-case tags")) {
    next.aiFreeformSystemPrompt = DEFAULT_AI_FREEFORM_SYSTEM_PROMPT;
    changed = true;
  }

  if (!next.aiTagMode) {
    next.aiTagMode = "freeform";
    changed = true;
  }

  if (typeof next.aiFinalAuthority !== "boolean") {
    next.aiFinalAuthority = true;
    changed = true;
  }

  if (typeof next.aiUseRuleHints !== "boolean") {
    next.aiUseRuleHints = true;
    changed = true;
  }

  if (typeof next.candidateAutoPromoteEnabled !== "boolean") {
    next.candidateAutoPromoteEnabled = true;
    changed = true;
  }

  if (!next.candidateAutoPromoteThreshold || Number(next.candidateAutoPromoteThreshold) < 2) {
    next.candidateAutoPromoteThreshold = 3;
    changed = true;
  }

  return { settings: next, changed };
}

function hashText(text) {
  let hash = 0;
  const source = String(text || "");
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return String(hash);
}

function sameStringSet(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function sameTagStateMap(left, right) {
  const leftMap = normalizeTagStateMap(left);
  const rightMap = normalizeTagStateMap(right);
  const leftPaths = Object.keys(leftMap).sort();
  const rightPaths = Object.keys(rightMap).sort();
  if (!sameStringSet(leftPaths, rightPaths)) {
    return false;
  }

  return leftPaths.every((filePath) => {
    const leftEntry = leftMap[filePath] || { managedTags: [], aiTags: [] };
    const rightEntry = rightMap[filePath] || { managedTags: [], aiTags: [] };
    return (
      sameStringSet(leftEntry.managedTags, rightEntry.managedTags) &&
      sameStringSet(leftEntry.aiTags, rightEntry.aiTags)
    );
  });
}

function normalizeTagStateMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = {};
  for (const [filePath, entry] of Object.entries(value)) {
    if (typeof filePath !== "string" || !filePath.trim()) {
      continue;
    }

    const normalizedEntry = {
      managedTags: normalizeTags(entry && entry.managedTags ? entry.managedTags : []),
      aiTags: normalizeTags(entry && entry.aiTags ? entry.aiTags : [])
    };

    if (normalizedEntry.managedTags.length || normalizedEntry.aiTags.length) {
      entries[filePath] = normalizedEntry;
    }
  }

  return entries;
}

function countAiTagOccurrencesByNote(tagStateByPath) {
  const counts = {};
  const normalizedState = normalizeTagStateMap(tagStateByPath);

  for (const entry of Object.values(normalizedState)) {
    for (const tag of uniqueStrings(entry.aiTags || [])) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  return counts;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
