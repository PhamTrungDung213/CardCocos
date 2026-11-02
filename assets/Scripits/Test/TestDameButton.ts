import { _decorator, Component, Button } from 'cc';
import { EnemyManager } from '../Enemies/EnemyManager';
const { ccclass, property } = _decorator;

@ccclass('TestDameButton')
export class TestDameButton extends Component {
    @property({ type: EnemyManager, tooltip: 'Kéo node EnemiesGround vào đây' })
    public enemyManager: EnemyManager = null!;

    @property({ tooltip: 'Lượng sát thương test' })
    public damageValue: number = 101;

    start() {
        const btn = this.getComponent(Button);
        if (btn) {
            this.node.on(Button.EventType.CLICK, this.onButtonClick, this);
        }
    }

    public onButtonClick(): void {
        if (!this.enemyManager) {
            console.warn('[TestDamageBtn] Chưa gán EnemyManager!');
            return;
        }

        console.log("[TestDamageBtn] Mảng gốc activeEnemies:", this.enemyManager.activeEnemies);

        // 1. Chạy hàm lọc
        const livingEnemies = this.enemyManager.activeEnemies.filter(
            enemy => enemy && enemy.currentHP > 0
        );

        console.log("[TestDamageBtn] Số quái còn sống sau lọc:", livingEnemies.length);

        if (livingEnemies.length === 0) {
            console.log('[TestDamageBtn] Không còn quái nào trên sân để đánh!');
            return;
        }

        // 2. Chọn ngẫu nhiên 1 mục tiêu bất kỳ đang đứng trên sân
        const randomIndex = Math.floor(Math.random() * livingEnemies.length);
        const targetEnemy = livingEnemies[randomIndex];

        // 3. Gây sát thương
        console.log(`[TestDamageBtn] Gây ${this.damageValue} sát thương lên ${targetEnemy.node.name} (${targetEnemy.enemyType})`);
        targetEnemy.takeDamage(this.damageValue);
    }
}