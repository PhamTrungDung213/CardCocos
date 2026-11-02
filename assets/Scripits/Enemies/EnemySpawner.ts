import { _decorator, Component, instantiate, Node, NodePool, Prefab, Layers } from 'cc';
import { EnemyType } from './EnemyData';
const { ccclass, property } = _decorator;

// Layer UI_2D = 1 << 25 = 33554432 (DEFAULT) vs UI_2D = 1 << 30 = 1073741824
// Dùng Layers.Enum.UI_2D để đảm bảo đúng, bất kể version engine
const UI_2D_LAYER = Layers.Enum.UI_2D;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {
    @property({ type: Prefab })
    public smol: Prefab = null!;

    @property({ type: Prefab })
    public mid: Prefab = null!;

    @property({ type: Prefab })
    public big: Prefab = null!;

    private _pools: Map<EnemyType, NodePool> = new Map();

    onLoad() {
        this._pools.set(EnemyType.SMOL, new NodePool);
        this._pools.set(EnemyType.MID, new NodePool);
        this._pools.set(EnemyType.BIG, new NodePool);
    }

    onDestroy() {
        this._pools.forEach(pool => pool.clear());
        this._pools.clear();
    }

    public spawn(type: EnemyType): Node {
        const pool = this._pools.get(type);
        let enemyNode: Node;

        if (pool && pool.size() > 0) {
            enemyNode = pool.get()!;
        } else {
            const prefab = this.getPrefabByType(type);
            enemyNode = instantiate(prefab);
        }

        // ✅ FIX: Gán đúng layer UI_2D cho node và toàn bộ con của nó
        // để Camera 2D nhận ra và gán _camera, tránh lỗi cameraPriority = null
        this.setLayerRecursively(enemyNode, UI_2D_LAYER);

        enemyNode.parent = this.node;
        enemyNode.active = true;
        return enemyNode;
    }

    public recycle(node: Node, type: EnemyType): void {
        const pool = this._pools.get(type);
        if (pool) {
            // ✅ FIX: Disable trước khi đưa vào pool để engine gỡ node khỏi
            // danh sách pointer event processor, tránh lỗi cameraPriority
            node.active = false;
            pool.put(node);
        } else {
            node.active = false;
            node.destroy();
        }
    }

    private setLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.setLayerRecursively(child, layer);
        }
    }

    private getPrefabByType(type: EnemyType): Prefab {
        switch (type) {
            case EnemyType.BIG: return this.big;
            case EnemyType.MID: return this.mid;
            case EnemyType.SMOL: return this.smol;
        }
    }
}
