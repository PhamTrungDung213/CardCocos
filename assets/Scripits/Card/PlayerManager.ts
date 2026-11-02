import { _decorator, Component, ProgressBar, Label, tween, Tween, CCInteger, Node, Vec3 } from 'cc';
import { EventBus, GameEvent } from '../Events/GameEvents';
const { ccclass, property } = _decorator;

@ccclass('PlayerManager')
export class PlayerManager extends Component {
    public static instance: PlayerManager | null = null;

    // --- MÁU (HP) ---
    @property({ type: ProgressBar, tooltip: 'Kéo node Bar (có ProgressBar) vào đây' })
    public hpBar: ProgressBar = null!;

    @property({ type: Label, tooltip: 'Kéo node CurrentHp (có Label) vào đây' })
    public hpLabel: Label = null!;

    @property({ type: CCInteger, tooltip: 'Máu tối đa của người chơi' })
    public maxHp: number = 100;

    // --- MANA ---
    @property({ type: Label, tooltip: 'Kéo node Player/Mana/Label vào đây' })
    public manaLabel: Label = null!;

    @property({ type: Node, tooltip: 'Kéo node Player/Mana vào đây' })
    public manaNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node Player/Mana/ManaBackground vào đây' })
    public manaBackground: Node = null!;

    @property({ type: CCInteger, tooltip: 'Số Mana được hồi lại đầu mỗi hiệp' })
    public turnMana: number = 3;

    private _currentHp: number = 100;
    private _currentMana: number = 3;

    onLoad() {
        PlayerManager.instance = this;
    }

    onDestroy() {
        if (PlayerManager.instance === this) {
            PlayerManager.instance = null;
        }
    }

    start() {
        this._currentHp = this.maxHp;
        this._currentMana = this.turnMana;

        this.updateHpUI(false);
        this.updateManaUI(false);

        EventBus.emit(GameEvent.PLAYER_HP_CHANGED, { current: this._currentHp, max: this.maxHp });
        EventBus.emit(GameEvent.PLAYER_MANA_CHANGED, { current: this._currentMana });
    }

    // =========================================================================
    // 1. QUẢN LÝ MANA
    // =========================================================================

    public get currentMana(): number {
        return this._currentMana;
    }

    /**
     * Kiểm tra xem người chơi có đủ Mana để dùng thẻ bài không
     */
    public hasEnoughMana(cost: number): boolean {
        return this._currentMana >= cost;
    }

    /**
     * Tiêu tốn Mana khi đánh bài vào Slot
     */
    public spendMana(cost: number): boolean {
        if (cost <= 0) return true;

        if (this._currentMana < cost) {
            console.warn(`[PlayerManager] Không đủ Mana: hiện có ${this._currentMana}, cần ${cost}`);
            this.flashNotEnoughMana();
            EventBus.emit(GameEvent.PLAYER_NOT_ENOUGH_MANA, { current: this._currentMana, cost });
            return false;
        }

        this._currentMana -= cost;
        this.updateManaUI(true);
        EventBus.emit(GameEvent.PLAYER_MANA_CHANGED, { current: this._currentMana });
        return true;
    }

    /**
     * Tăng Mana (khi discard thẻ bài hoặc hoàn lại bài từ Slot về tay)
     */
    public gainMana(amount: number): void {
        if (amount <= 0) return;

        this._currentMana += amount;
        this.updateManaUI(true);
        EventBus.emit(GameEvent.PLAYER_MANA_CHANGED, { current: this._currentMana });
    }

    /**
     * Phục hồi Mana khi bắt đầu hiệp mới (Mặc định 3 Mana)
     */
    public resetManaForTurn(): void {
        this._currentMana = this.turnMana;
        this.updateManaUI(true);
        EventBus.emit(GameEvent.PLAYER_MANA_CHANGED, { current: this._currentMana });
        console.log(`[PlayerManager] Phục hồi ${this._currentMana} Mana đầu hiệp.`);
    }

    /**
     * Cập nhật số hiển thị trên kim cương Mana kèm hiệu ứng nhấp nháy/nảy
     */
    public updateManaUI(animate: boolean = true): void {
        if (this.manaLabel) {
            this.manaLabel.string = `${this._currentMana}`;
            this.manaLabel.cacheMode = Label.CacheMode.BITMAP;
            this.manaLabel.isBold = true;
        }

        const bg = this.manaBackground || this.manaNode;
        if (animate && bg) {
            tween(bg)
                .to(0.08, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'quadOut' })
                .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'quadIn' })
                .start();
        }
    }

    /**
     * Rung lắc biểu tượng Mana cảnh báo khi người chơi không đủ Mana
     */
    public flashNotEnoughMana(): void {
        const bg = this.manaBackground || this.manaNode;
        if (!bg) return;

        const origPos = bg.position.clone();
        tween(bg)
            .to(0.05, { position: new Vec3(origPos.x - 6, origPos.y, origPos.z) })
            .to(0.05, { position: new Vec3(origPos.x + 6, origPos.y, origPos.z) })
            .to(0.05, { position: new Vec3(origPos.x - 4, origPos.y, origPos.z) })
            .to(0.05, { position: origPos })
            .start();
    }

    // =========================================================================
    // 2. QUẢN LÝ MÁU (HP)
    // =========================================================================

    public updateHpUI(animate: boolean = true): void {
        const targetProgress = this.maxHp > 0 ? (this._currentHp / this.maxHp) : 0;

        if (this.hpLabel) {
            this.hpLabel.string = `${this._currentHp}/${this.maxHp}`;
        }

        if (!this.hpBar) return;

        // Dừng các tween cũ đang can thiệp vào thanh máu để tránh xung đột
        Tween.stopAllByTarget(this.hpBar);

        if (animate) {
            tween(this.hpBar)
                .to(0.25, { progress: targetProgress }, { easing: 'sineOut' })
                .start();
        } else {
            this.hpBar.progress = targetProgress;
        }
    }

    public takeDamage(damage: number): void {
        if (this._currentHp <= 0) return; // Đã hết máu thì dừng mọi nhận đòn

        this._currentHp = Math.max(0, this._currentHp - damage);
        this.updateHpUI(true);

        EventBus.emit(GameEvent.PLAYER_HP_CHANGED, { current: this._currentHp, max: this.maxHp });
        EventBus.emit(GameEvent.PLAYER_TOOK_DAMAGE, { damage, remainingHp: this._currentHp });

        if (this._currentHp <= 0) {
            console.log('[PlayerManager] Người chơi đã hy sinh!');
            EventBus.emit(GameEvent.PLAYER_DIED);
        }
    }

    public heal(amount: number): void {
        this._currentHp = Math.min(this.maxHp, this._currentHp + amount);
        this.updateHpUI(true);

        EventBus.emit(GameEvent.PLAYER_HP_CHANGED, { current: this._currentHp, max: this.maxHp });
        EventBus.emit(GameEvent.PLAYER_HEALED, { amount, currentHp: this._currentHp });
    }

    public get currentHp(): number {
        return this._currentHp;
    }

    public get isAlive(): boolean {
        return this._currentHp > 0;
    }
}
