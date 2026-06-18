import {
  StrategyTrialRecord,
  StrategyTrialStoreData,
  EMPTY_STRATEGY_TRIAL_STORE,
} from "@/domain/strategy/strategy-trial-record";
import { JsonFileStore } from "@/server/storage/json-file-store";
import { getStrategyTrialsPath } from "@/server/storage/storage-paths";

/**
 * StrategyTrialStore
 *
 * 전략 실험 기록을 영속 저장한다.
 * rejected 전략을 포함해 모든 trial을 삭제하지 않는다.
 * parameterHash 중복 감지로 동일 실험의 반복을 경고한다.
 */
export class StrategyTrialStore {
  private store: JsonFileStore<StrategyTrialStoreData>;

  constructor() {
    this.store = new JsonFileStore<StrategyTrialStoreData>(
      getStrategyTrialsPath(),
      EMPTY_STRATEGY_TRIAL_STORE
    );
  }

  async getAll(): Promise<StrategyTrialRecord[]> {
    const data = await this.store.read();
    return data.trials;
  }

  async getById(id: string): Promise<StrategyTrialRecord | null> {
    const trials = await this.getAll();
    return trials.find((t) => t.id === id) ?? null;
  }

  async getByStrategyId(strategyId: string): Promise<StrategyTrialRecord[]> {
    const trials = await this.getAll();
    return trials.filter((t) => t.strategyId === strategyId);
  }

  async create(trial: StrategyTrialRecord): Promise<StrategyTrialRecord> {
    const data = await this.store.read();
    data.trials.push(trial);
    data.lastUpdatedAt = new Date().toISOString();
    await this.store.write(data);
    return trial;
  }

  async update(
    id: string,
    patch: Partial<Pick<StrategyTrialRecord, "validationStatus" | "rejectionReason" | "biasWarnings" | "backtestRunId" | "observedMetrics">>
  ): Promise<StrategyTrialRecord | null> {
    const data = await this.store.read();
    const idx = data.trials.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    data.trials[idx] = {
      ...data.trials[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    data.lastUpdatedAt = new Date().toISOString();
    await this.store.write(data);
    return data.trials[idx];
  }

  /**
   * 동일 parameterHash가 이미 존재하면 해당 trial을 반환한다.
   * 데이터 스누핑 방지: 같은 파라미터를 반복해서 테스트하고 있을 가능성 감지.
   */
  async findDuplicateByHash(
    parameterHash: string,
    strategyId: string
  ): Promise<StrategyTrialRecord | null> {
    const trials = await this.getByStrategyId(strategyId);
    return trials.find((t) => t.parameterHash === parameterHash) ?? null;
  }
}

export const strategyTrialStore = new StrategyTrialStore();
