import { _decorator, Component, Node } from 'cc';
import { EnemyIntentType, EnemyType, IEnemyAction } from './EnemyData';
const { ccclass, property } = _decorator;

@ccclass('EnemyAbility')
export class EnemyAbility extends Component {
    @property({ type: Node })
    public container: Node = null!;

    private _enemyType: EnemyType = EnemyType.SMOL;
    private _baseDamage: number = 10;
    private _currentAction!: IEnemyAction;

    public initAbility(type: EnemyType, baseDamage: number): void {
        this._enemyType = type;
        this._baseDamage = baseDamage > 0 ? baseDamage : 10;
        this.nextAction();
    }

    public nextAction(): IEnemyAction {
        const eRand = Math.random();
        switch (this._enemyType) {
            case EnemyType.SMOL: {
                if (eRand < 0.75) {
                    // Đòn tấn công cơ bản (75%)
                    this._currentAction = {
                        type: EnemyIntentType.ATTACK,
                        value: this._baseDamage,
                    };
                } else {
                    // Đòn bộc phát chí mạng (25%)
                    this._currentAction = {
                        type: EnemyIntentType.ATTACK,
                        value: Math.floor(this._baseDamage * 1.4),
                    };
                }
                break;
            }

            case EnemyType.MID: {
                if (eRand < 0.7) {
                    // Đòn tấn công tiêu chuẩn (70%)
                    this._currentAction = {
                        type: EnemyIntentType.ATTACK,
                        value: this._baseDamage,
                    };
                } else {
                    // Hồi máu bản thân (30%)
                    const eHealValue = Math.max(6, Math.floor(this._baseDamage * 0.8));
                    this._currentAction = {
                        type: EnemyIntentType.HEAL,
                        value: eHealValue,
                    };
                }
                break;
            }

            case EnemyType.BIG: {
                if (eRand < 0.65) {
                    // Cú đập cực mạnh (65%)
                    this._currentAction = {
                        type: EnemyIntentType.ATTACK,
                        value: this._baseDamage,
                    };
                } else {
                    // Đòn gồng nộ cực nặng (35%)
                    const smashDmg = Math.floor(this._baseDamage * 1.35);
                    this._currentAction = {
                        type: EnemyIntentType.ATTACK,
                        value: smashDmg,
                    };
                }
                break;
            }
        }

        return this._currentAction;
    }

    public getCurrentAction(): IEnemyAction {
        if (!this._currentAction) {
            this.nextAction();
        }
        return this._currentAction;
    }
}
