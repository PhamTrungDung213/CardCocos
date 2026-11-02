import { _decorator, Component, ProgressBar, tween, Node, Vec3, Color, Sprite, Tween } from 'cc';
import { EnemyType, IEnemyConfig } from './EnemyData';
import { EnemyAbility } from './EnemyAbility';
const { ccclass, property } = _decorator;

@ccclass('EnemyCtrl')
export class EnemyCtrl extends Component {
    @property({ type: ProgressBar })
    public eHPBar: ProgressBar | null = null;

    @property({ type: EnemyAbility })
    public ability: EnemyAbility | null = null;

    public enemyType: EnemyType = EnemyType.SMOL;
    public baseDamage: number = 10;

    private _maxHp: number = 100;
    private _currentHP: number = 100;
    private _onDieCallback: ((enemy: EnemyCtrl) => void) | null = null;
    private _originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad() {
    }

    public initE(config: IEnemyConfig, onDie?: (enemy: EnemyCtrl) => void): void {
        this._maxHp = config.maxHp;
        this._currentHP = config.maxHp;
        this.enemyType = config.type;
        this.baseDamage = config.baseDamage || 10;
        this._onDieCallback = onDie || null;

        this.updateHpBar(false);

        if (!this.ability) {
            this.ability = this.getComponent(EnemyAbility);
        }

        if (this.ability) {
            this.ability.initAbility(config.type, this.baseDamage);
        }
    }

    public updateHpBar(animate: boolean = true): void {
        if (!this.eHPBar) return;

        const targetProgress = this._maxHp > 0 ? (this._currentHP / this._maxHp) : 0;

        // Dừng tất cả các tween cũ đang can thiệp vào eHPBar để tránh xung đột đè thanh máu
        Tween.stopAllByTarget(this.eHPBar);

        if (animate) {
            tween(this.eHPBar)
                .to(0.2, { progress: targetProgress }, { easing: "sineOut" })
                .start();
        } else {
            this.eHPBar.progress = targetProgress;
        }
    }

    /**
     * Nhận sát thương từ người chơi:
     * - Trừ máu chuẩn xác
     * - Cập nhật thanh máu eHPBar
     * - Hiệu ứng rung giật / nảy nhẹ để người chơi thấy rõ đòn đánh trúng mục tiêu
     */
    public takeDamage(damage: number): void {
        if (this._currentHP <= 0) return; // Đã chết thì không nhận thêm dame

        this._currentHP = Math.max(0, this._currentHP - damage);
        console.log(`[EnemyCtrl] ${this.node.name} (${this.enemyType}) dính đòn: -${damage} HP -> Còn lại: ${this._currentHP}/${this._maxHp}`);

        this.updateHpBar(true);
        this.playHitReaction();

        if (this._currentHP <= 0) {
            this.onDead();
        }
    }

    /**
     * Hồi máu cho quái vật
     */
    public heal(amount: number): void {
        if (this._currentHP <= 0) return;

        this._currentHP = Math.min(this._maxHp, this._currentHP + amount);
        this.updateHpBar(true);

        // Nảy nhẹ màu xanh khi hồi máu
        const origScale = this.node.scale.clone();
        tween(this.node)
            .to(0.1, { scale: new Vec3(origScale.x * 1.1, origScale.y * 1.1, 1) })
            .to(0.12, { scale: origScale })
            .start();
    }

    /**
     * Hiệu ứng nảy rung phản hồi khi dính đòn đánh (Hit Reaction)
     */
    private playHitReaction(): void {
        const curScale = this.node.scale.clone();
        Tween.stopAllByTarget(this.node);

        // Nảy ép dẹp nhẹ mô phỏng trúng đòn
        tween(this.node)
            .to(0.06, { scale: new Vec3(curScale.x * 1.15, curScale.y * 0.88, 1) })
            .to(0.08, { scale: curScale })
            .start();
    }

    public onDead(): void {
        if (this._onDieCallback) {
            this._onDieCallback(this);
        }
    }

    public get currentHP(): number {
        return this._currentHP;
    }

    public get maxHp(): number {
        return this._maxHp;
    }
}
