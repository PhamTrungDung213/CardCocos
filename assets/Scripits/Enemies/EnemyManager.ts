import { _decorator, Component, Node, UITransform, Vec3, tween } from 'cc';
import { EnemySpawner } from './EnemySpawner';
import { EnemyIntentType, EnemyType, IEnemyConfig } from './EnemyData';
import { EnemyCtrl } from './EnemyCtrl';
import { EventBus, GameEvent } from '../Events/GameEvents';
import { PlayerManager } from '../Card/PlayerManager';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {
    public static instance: EnemyManager | null = null;

    @property({ type: EnemySpawner, tooltip: 'Kéo node SpawnEnemies vào đây' })
    public spawner: EnemySpawner = null!;

    // --- CẤU HÌNH TỈ LỆ RA QUÁI ---
    @property({ tooltip: 'Trọng số xuất hiện Smol' })
    public rateSmol: number = 60;

    @property({ tooltip: 'Trọng số xuất hiện Mid' })
    public rateMid: number = 30;

    @property({ tooltip: 'Trọng số xuất hiện Big' })
    public rateBig: number = 10;

    // --- CẤU HÌNH SỐ LƯỢNG ---
    @property({ tooltip: 'Số lượng tối thiểu' })
    public minEnemies: number = 1;

    @property({ tooltip: 'Số lượng tối đa' })
    public maxEnemies: number = 5;

    @property({ tooltip: 'Số quái tối đa cùng lúc trên sân' })
    public maxOnScreen: number = 3;

    // --- CẤU HÌNH BỐ CỤC THEO % SCREEN WIDTH ---
    @property({
        tooltip: 'Tỉ lệ khoảng cách giữa 2 quái theo bề rộng màn hình (0.28 = 28% width)',
        min: 0.05,
        max: 0.5,
        step: 0.01
    })
    public spacingRatio: number = 0.28;

    @property({
        tooltip: 'Tỉ lệ lề an toàn 2 bên theo bề rộng màn hình (0.08 = 8% width)',
        min: 0.0,
        max: 0.2,
        step: 0.01
    })
    public paddingRatio: number = 0.08;

    private _activeEnemies: EnemyCtrl[] = [];
    private _waitingQueue: IEnemyConfig[] = [];

    onLoad() {
        EnemyManager.instance = this;
    }

    onDestroy() {
        if (EnemyManager.instance === this) {
            EnemyManager.instance = null;
        }
    }

    start() {
        this.initEnemies();
    }

    // =========================================================================
    // 1. SINH QUÁI VẬT BAN ĐẦU & HÀNG CHỜ TIẾP VIỆN
    // =========================================================================

    public initEnemies(): void {
        this.clearAllEnemies();

        const totalWaveCount = Math.floor(
            Math.random() * (this.maxEnemies - this.minEnemies + 1)
        ) + this.minEnemies;

        console.log(`[EnemyManager] Tổng số quái trận này: ${totalWaveCount}`);

        const initialCount = Math.min(this.maxOnScreen, totalWaveCount);
        for (let i = 0; i < initialCount; i++) {
            const config = this.createRandomEnemyConfig(i + 1);
            this.spawnEnemyToField(config);
        }

        const remainingCount = totalWaveCount - initialCount;
        for (let i = 0; i < remainingCount; i++) {
            const config = this.createRandomEnemyConfig(initialCount + i + 1);
            this._waitingQueue.push(config);
        }

        this.realignEnemies(false);
    }

    private getRandomEnemyType(): EnemyType {
        const totalWeight = this.rateSmol + this.rateMid + this.rateBig;
        const rand = Math.random() * totalWeight;

        if (rand < this.rateSmol) {
            return EnemyType.SMOL;
        } else if (rand < this.rateSmol + this.rateMid) {
            return EnemyType.MID;
        } else {
            return EnemyType.BIG;
        }
    }

    private createRandomEnemyConfig(index: number): IEnemyConfig {
        const type = this.getRandomEnemyType();

        switch (type) {
            case EnemyType.BIG:
                return {
                    id: `big_${index}`,
                    name: `BIG`,
                    type: EnemyType.BIG,
                    maxHp: 70,       // Quái to: 70 HP (cân bằng lại từ 160)
                    baseDamage: 12   // Dame: 12 (cân bằng lại từ 24)
                };
            case EnemyType.MID:
                return {
                    id: `mid_${index}`,
                    name: `MID`,
                    type: EnemyType.MID,
                    maxHp: 45,       // Quái vừa: 45 HP (cân bằng lại từ 80)
                    baseDamage: 8    // Dame: 8 (cân bằng lại từ 12)
                };
            case EnemyType.SMOL:
            default:
                return {
                    id: `smol_${index}`,
                    name: `SMOL`,
                    type: EnemyType.SMOL,
                    maxHp: 25,       // Quái nhỏ: 25 HP (cân bằng lại từ 35)
                    baseDamage: 5    // Dame: 5 (cân bằng lại từ 18)
                };
        }
    }

    private spawnEnemyToField(config: IEnemyConfig): EnemyCtrl {
        const node = this.spawner.spawn(config.type);
        const ctrl = node.getComponent(EnemyCtrl)!;

        ctrl.initE(config, (deadEnemy) => this.onEnemyDefeated(deadEnemy));
        this._activeEnemies.push(ctrl);

        const targetScale = this.getTargetScale(config.type);
        node.setScale(targetScale);

        return ctrl;
    }

    public realignEnemies(animate: boolean = true): void {
        const count = this._activeEnemies.length;
        if (count === 0) return;

        const groundTransform = this.getComponent(UITransform)!;
        const screenWidth = groundTransform.contentSize.width;

        const actualPadding = screenWidth * this.paddingRatio;
        const defaultSpacing = screenWidth * this.spacingRatio;
        const availableWidth = screenWidth - (actualPadding * 2);

        let spacing = defaultSpacing;
        if ((count - 1) * spacing > availableWidth) {
            spacing = count > 1 ? availableWidth / (count - 1) : 0;
        }

        const startX = -((count - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            const enemyCtrl = this._activeEnemies[i];
            const enemyNode = enemyCtrl.node;
            const targetX = startX + i * spacing;
            const targetPos = new Vec3(targetX, 0, 0);

            const targetScale = this.getTargetScale(enemyCtrl.enemyType);

            if (animate) {
                tween(enemyNode)
                    .to(0.25, { position: targetPos, scale: targetScale }, { easing: 'sineOut' })
                    .start();
            } else {
                enemyNode.setPosition(targetPos);
                enemyNode.setScale(targetScale);
            }
        }
    }

    public onEnemyDefeated(enemy: EnemyCtrl): void {
        const index = this._activeEnemies.indexOf(enemy);
        if (index !== -1) {
            this._activeEnemies.splice(index, 1);
        }

        EventBus.emit(GameEvent.ENEMY_DEFEATED, { enemy });

        this.spawner.recycle(enemy.node, enemy.enemyType);

        if (this._waitingQueue.length > 0) {
            const nextConfig = this._waitingQueue.shift()!;
            console.log(`[EnemyManager] Tiếp viện: ${nextConfig.name}`);
            this.spawnEnemyToField(nextConfig);
        }

        this.realignEnemies(true);

        if (this.isAllEnemiesDead()) {
            console.log('[EnemyManager] Toàn bộ quái vật đã bị tiêu diệt!');
            EventBus.emit(GameEvent.ALL_ENEMIES_DEFEATED);
        }
    }

    public getLivingEnemies(): EnemyCtrl[] {
        return this._activeEnemies.filter(enemy => enemy && enemy.currentHP > 0);
    }

    public isAllEnemiesDead(): boolean {
        return this.getLivingEnemies().length === 0 && this._waitingQueue.length === 0;
    }

    /**
     * Thực thi lượt tấn công của quái vật:
     * Từng quái vật còn sống lần lượt lao lên tấn công Player và gây sát thương chuẩn xác.
     * Nếu Player hết máu tại bất kỳ thời điểm nào, lập tức kết thúc chuỗi tấn công ngay.
     */
    public executeEnemyTurn(onComplete: () => void): void {
        const living = this.getLivingEnemies();
        if (living.length === 0) {
            onComplete();
            return;
        }

        let currentIndex = 0;
        let isStopped = false;

        const stopTurn = () => {
            if (isStopped) return;
            isStopped = true;
            onComplete();
        };

        const executeNext = () => {
            if (isStopped) return;

            // KIỂM TRA NGAY LẬP TỨC: Nếu người chơi đã chết -> Dừng ngay lập tức!
            if (PlayerManager.instance && !PlayerManager.instance.isAlive) {
                console.log('[EnemyManager] Người chơi đã hết máu! Dừng toàn bộ lượt quái ngay lập tức!');
                stopTurn();
                return;
            }

            if (currentIndex >= living.length) {
                stopTurn();
                return;
            }

            const enemy = living[currentIndex];
            if (!enemy || enemy.currentHP <= 0) {
                currentIndex++;
                executeNext();
                return;
            }

            // Đọc hành động của quái
            const action = enemy.ability ? enemy.ability.getCurrentAction() : null;
            let damage = (action && action.value > 0) ? action.value : (enemy.baseDamage || 8);

            if (action && action.type === EnemyIntentType.HEAL) {
                // Quái tự hồi phục máu
                enemy.heal(action.value);
                console.log(`[EnemyManager] ${enemy.node.name} (${enemy.enemyType}) tự hồi ${action.value} HP!`);
                damage = Math.max(2, Math.floor((enemy.baseDamage || 6) * 0.4));
            }

            // Đảm bảo sát thương tối thiểu 1
            damage = Math.max(1, damage);

            const originalPos = enemy.node.position.clone();
            const attackPos = new Vec3(originalPos.x, originalPos.y - 45, originalPos.z);

            console.log(`[EnemyManager] ${enemy.node.name} (${enemy.enemyType}) tấn công gây ${damage} sát thương lên người chơi!`);

            // Hiệu ứng lao lên tấn công
            tween(enemy.node)
                .to(0.15, { position: attackPos }, { easing: 'quadIn' })
                .call(() => {
                    PlayerManager.instance?.takeDamage(damage);

                    // Kiểm tra ngay sau khi gây sát thương: Nếu người chơi đã chết -> dừng ngay chuỗi quái!
                    if (PlayerManager.instance && !PlayerManager.instance.isAlive) {
                        console.log('[EnemyManager] Người chơi đã bị hạ gục sau đòn này! Lập tức dừng chuỗi quái!');
                        stopTurn();
                    }
                })
                .to(0.2, { position: originalPos }, { easing: 'quadOut' })
                .delay(0.15)
                .call(() => {
                    if (isStopped) return;

                    if (enemy.ability) {
                        enemy.ability.nextAction();
                    }

                    if (PlayerManager.instance && !PlayerManager.instance.isAlive) {
                        stopTurn();
                        return;
                    }

                    currentIndex++;
                    executeNext();
                })
                .start();
        };

        executeNext();
    }

    public get activeEnemies(): EnemyCtrl[] {
        return this._activeEnemies;
    }

    private getTargetScale(type: EnemyType): Vec3 {
        switch (type) {
            case EnemyType.BIG: return new Vec3(0.5, 0.5, 1);
            case EnemyType.MID: return new Vec3(0.4, 0.4, 1);
            case EnemyType.SMOL: return new Vec3(0.3, 0.3, 1);
            default: return new Vec3(0.35, 0.35, 1);
        }
    }

    private clearAllEnemies(): void {
        for (const enemy of this._activeEnemies) {
            if (enemy && enemy.node) {
                this.spawner.recycle(enemy.node, enemy.enemyType);
            }
        }
        this._activeEnemies = [];
        this._waitingQueue = [];
    }
}
