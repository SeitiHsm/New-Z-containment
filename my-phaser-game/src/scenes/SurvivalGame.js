import Phaser from "phaser";

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super("SurvivalGame");
        this.playerMaxHp = 5; // Máximo de hits (vidas)
        this.playerHp = this.playerMaxHp; // Vida inicial do personagem
        this.playerDamage = 1;
        this.canRevive = false;
        this.revivedOnce = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 150; // Velocidade base dos zumbis
        this.zombieBaseHp = 3; // HP base dos zumbis
        this.invulnerable = false; // Flag de invulnerabilidade
        this.invulnerableTime = 1000; // Tempo de invulnerabilidade (1 segundo)
        this.money = 0; // Quant. de dinheiro no começo do game
        this.purchasedUpgrades = new Set(); // Armazena upgrades já comprados
    }

    preload() {
        // ... outros loads prq no assets não deu
        this.load.image('perk_forca', 'assets/perks/doubletap.png');
        this.load.image('perk_reviver', 'assets/perks/revive.png');
        this.load.image('perk_resistencia', 'assets/perks/forca.png');
        this.load.image('perk_recarga', 'assets/perks/speed.png');
    }

    create() {
        // Zerando status
        this.playerHp = this.playerMaxHp;
        this.invulnerable = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 150;
        this.zombieBaseHp = 3;
        this.money = 0;

        this.createPlayer();
        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUI();
        this.setupCollisions();
        this.setupMouseShoot();
        this.startZombieSpawner();
        this.startRoundTimer();
        this.createUpgradeAreas();
        this.createUpgradeInput();

        this.physics.world.setBounds(0, 0, 2000, 2000);
        this.cameras.main.setBounds(0, 0, 2000, 2000);
        this.cameras.main.startFollow(this.player);
        this.playerHp = this.playerMaxHp;
        this.purchasedUpgrades = new Set();

        //Modificando cursor
        this.input.setDefaultCursor('url(assets/imagens/crosshair.png) 32 32, pointer');


    }

    update() {
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.updateUI();
        this.checkUpgradeAreaOverlap();
    }

    createPlayer() {
        this.player = this.add.rectangle(1000, 1000, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.playerHp = this.playerMaxHp; // Reseta a vida do personagem
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D");
    }

    createGroups() {
        this.zombies = this.physics.add.group();
        this.bullets = this.physics.add.group();
    }

    createObstacles() {
        this.obstacles = this.physics.add.staticGroup();

        const positions = [
            { x: 800, y: 1000 },
            { x: 1200, y: 1100 },
            { x: 1600, y: 950 },
            { x: 1000, y: 1400 },
        ];

        positions.forEach((pos) => {
            const obs = this.obstacles.create(pos.x, pos.y, "obstacle");
            obs.setScale(0.5).refreshBody();
        });
    }

    createUI() {
        this.healthBarBg = this.add
            .rectangle(20, 20, 104, 14, 0x000000)
            .setScrollFactor(0)
            .setOrigin(0);
        this.healthBar = this.add
            .rectangle(22, 22, 100, 10, 0xff0000)
            .setScrollFactor(0)
            .setOrigin(0);
        this.scoreText = this.add
            .text(20, 40, "Pontos: 0", { fontSize: "16px", fill: "#ffffff" })
            .setScrollFactor(0);
        this.roundText = this.add
            .text(20, 60, "Round: 1", { fontSize: "16px", fill: "#ffffff" })
            .setScrollFactor(0);
        this.moneyText = this.add
            .text(20, 80, 'Dinheiro: 0', {fontSize: '16px', fill: '#ffffff'})
            .setScrollFactor(0);

        this.perkIcons = []; // Armazena os ícones ativos
        this.perkIconStartX = 20; // posição inicial X (canto inferior esquerdo)
        this.perkIconStartY = this.scale.height - 40; // Y fixo
    }

    updateUI() {
        this.healthBar.width = (this.playerHp / this.playerMaxHp) * 100;
        this.scoreText.setText("Pontos: " + this.score);
        this.roundText.setText("Round: " + this.round);
        this.moneyText.setText("Dinheiro: " + this.money);
    }

    setupCollisions() {
        this.physics.add.overlap(
            this.zombies,
            this.player,
            this.handlePlayerHit,
            null,
            this
        );
        this.physics.add.overlap(
            this.bullets,
            this.zombies,
            this.hitZombie,
            null,
            this
        );
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.zombies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) =>
            bullet.destroy()
        );
    }

    setupMouseShoot() {
        this.input.on("pointerdown", () => {
            this.shootBullet();
        });
    }

    handlePlayerMovement() {
        const speed = 200;
        const body = this.player.body;
        body.setVelocity(0);

        if (this.cursors.left.isDown || this.keys.A.isDown)
            body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown)
            body.setVelocityX(speed);

        if (this.cursors.up.isDown || this.keys.W.isDown)
            body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown)
            body.setVelocityY(speed);
    }

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate((zombie) => {
            if (zombie.type === "smart") {
                // Pathfinding simples com raycasting
                const angleToPlayer = Phaser.Math.Angle.Between(
                    zombie.x,
                    zombie.y,
                    this.player.x,
                    this.player.y
                );
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    zombie.x,
                    zombie.y,
                    this.player.x,
                    this.player.y
                );

                // Cria um raycast para verificar obstáculos
                const ray = new Phaser.Geom.Line(
                    zombie.x,
                    zombie.y,
                    zombie.x + Math.cos(angleToPlayer) * distanceToPlayer,
                    zombie.y + Math.sin(angleToPlayer) * distanceToPlayer
                );
                let hit = false;
                this.obstacles.children.iterate((obstacle) => {
                    if (
                        Phaser.Geom.Intersects.LineToRectangle(
                            ray,
                            obstacle.getBounds()
                        )
                    ) {
                        hit = true;
                        return false; // Para a iteração
                    }
                });

                if (hit) {
                    // Desvia movendo-se em uma direção perpendicular
                    const perpendicularAngle = angleToPlayer + Math.PI / 2;
                    this.physics.velocityFromRotation(
                        perpendicularAngle,
                        zombie.speed,
                        zombie.body.velocity
                    );
                } else {
                    this.physics.moveToObject(
                        zombie,
                        this.player,
                        zombie.speed
                    );
                }
            } else {
                this.physics.moveToObject(zombie, this.player, zombie.speed);
            }
        });
    }

    shootBullet() {
        const bullet = this.add.rectangle(
            this.player.x,
            this.player.y,
            10,
            5,
            0xffff00
        );
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);

        bullet.body.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;

        const pointer = this.input.activePointer;
        const angle = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            pointer.worldX,
            pointer.worldY
        );
        const speed = 500;

        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);

        this.time.delayedCall(2000, () => bullet.destroy());
    }

    startZombieSpawner() {
        this.zombieTimer = this.time.addEvent({
            delay: 5000, // Intervalo maior para ondas
            callback: () => {
                const zombiesInWave = Phaser.Math.Between(3, 6); // 3 a 6 zumbis por onda
                for (let i = 0; i < zombiesInWave; i++) {
                    this.time.delayedCall(i * 500, this.spawnZombie, [], this);
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    spawnZombie() {
        const types = ["fast", "tank", "smart"];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        let zombieSpeed = this.zombieBaseSpeed;
        let zombieHp = this.zombieBaseHp;
        let color = 0xff0000; // Vermelho (padrão)

        if (type === "fast") {
            zombieSpeed *= 1.5; // 50% mais rápido
            zombieHp = 1; // Menos resistente
            color = 0xffa500; // Laranja
        } else if (type === "tank") {
            zombieSpeed *= 0.7; // 30% mais lento
            zombieHp = 5; // Mais resistente
            color = 0x800080; // Roxo
        } else if (type === "smart") {
            zombieSpeed *= 1.2; // 20% mais rápido
            zombieHp = 3; // HP padrão
            color = 0x00ffff; // Ciano
        }

        const margin = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;

        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0:
                x = Phaser.Math.Between(0, worldWidth);
                y = -margin;
                break;
            case 1:
                x = Phaser.Math.Between(0, worldWidth);
                y = worldHeight + margin;
                break;
            case 2:
                x = -margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
            case 3:
                x = worldWidth + margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
        }

        const zombie = this.add.rectangle(x, y, 30, 30, color);
        this.physics.add.existing(zombie);
        zombie.hp = zombieHp;
        zombie.speed = zombieSpeed;
        zombie.type = type;
        this.zombies.add(zombie);
    }

    spawnBossZombie() {
        const margin = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;

        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0:
                x = Phaser.Math.Between(0, worldWidth);
                y = -margin;
                break;
            case 1:
                x = Phaser.Math.Between(0, worldWidth);
                y = worldHeight + margin;
                break;
            case 2:
                x = -margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
            case 3:
                x = worldWidth + margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
        }

        const boss = this.add.rectangle(x, y, 50, 50, 0x0000ff); // Azul para o chefão
        this.physics.add.existing(boss);
        boss.hp = this.zombieBaseHp * 3; // 3x o HP base
        boss.speed = this.zombieBaseSpeed * 0.8; // 20% mais lento
        boss.type = "boss";
        this.zombies.add(boss);
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable || !this.scene.isActive()) return;

        this.playerHp--;

        this.invulnerable = true;

        // Efeito visual de dano
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.player.setAlpha(1);
            },
        });

        this.time.delayedCall(this.invulnerableTime, () => {
            this.invulnerable = false;
        });

        if (this.playerHp <= 0) {
            if (this.canRevive && !this.revivedOnce) {
                this.revivedOnce = true;

                // RESETA BUFFS (menos o revive)
                this.playerMaxHp = 5;
                this.playerHp = this.playerMaxHp;
                this.playerDamage = 1;
                this.canRevive = false; // revive foi consumido
                this.purchasedUpgrades.clear(); // limpa upgrades comprados
                this.perkIcons.forEach(icon => icon.destroy());
                this.perkIcons = [];

                this.upgradeText.setText('Você reviveu!');
                this.upgradeText.setPosition(this.player.x - 60, this.player.y - 40);
                this.upgradeText.setVisible(true);
                this.time.delayedCall(2000, () => {
                    this.upgradeText.setVisible(false);
                });

                return;
            }

            this.scene.start("GameOver");
        }
    }

    hitZombie(bullet, zombie) {
        bullet.destroy();
        zombie.hp -= this.playerDamage;

        this.money += 10;

        this.tweens.add({
            targets: zombie,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
        });
        if (zombie.hp <= 0) {
            zombie.destroy();
            this.score += zombie.type === "boss" ? 50 : 10; // 50 pontos para chefão

            this.money += 100;
        }
    }

    startRoundTimer() {
        this.time.addEvent({
            delay: 15000, // A cada 15 segundos
            callback: () => {
                this.round++;
                this.zombieBaseHp += 1;
                this.zombieBaseSpeed += 10;
                if (this.round % 3 === 0) {
                    this.spawnBossZombie(); // Spawna chefão a cada 3 rounds
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    createUpgradeAreas() {
        this.upgradeAreas = [];

        // Texto flutuante sobre o jogador
        this.upgradeText = this.add.text(0, 0, '', {
            fontSize: '18px',
            fill: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(1).setVisible(false);

        // Áreas e custos
        const areaData = [
            { x: 500, y: 500, cost: 2000, upgrade: 'forca' },
            { x: 1500, y: 500, cost: 1500, upgrade: 'reviver' },
            { x: 500, y: 1500, cost: 2500, upgrade: 'resistencia' },
            { x: 1500, y: 1500, cost: 3000, upgrade: 'recarga' } // ainda não implementado
        ];

        areaData.forEach((data, index) => {
            const area = this.add.rectangle(data.x, data.y, 100, 100, 0xffffff, 0.2);
            this.physics.add.existing(area, true);
            area.cost = data.cost;
            area.upgradeType = data.upgrade;
            area.upgradeName = {
                forca: 'double hit',
                reviver: 'quick resurrect',
                resistencia: 'juggermax',
                recarga: 'fast chug'
            }[data.upgrade];
            area.message = `pressione E para ${area.upgradeName}, ${area.cost}`;
            this.upgradeAreas.push(area);
        });

        this.currentUpgradeArea = null;
    }

    createUpgradeInput() {
        this.input.keyboard.on('keydown-E', () => {
            if (this.currentUpgradeArea) {
                const area = this.currentUpgradeArea;

                if (this.purchasedUpgrades.has(area.upgradeType)) {
                    this.upgradeText.setText(`Upgrade já comprado`);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                    return;
                }

                if (this.money >= area.cost) {
                    this.money -= area.cost;
                    this.purchasedUpgrades.add(area.upgradeType);

                    switch (area.upgradeType) {
                        case 'forca':
                            this.playerDamage = 2;
                            break;
                        case 'reviver':
                            this.canRevive = true;
                            break;
                        case 'resistencia':
                            this.playerMaxHp += 2;
                            this.playerHp += 2;
                            break;
                    }

                    this.addPerkIcon(area.upgradeType);

                    this.upgradeText.setText(`Upgrade de ${area.upgradeType} comprado!`);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });

                    // Pode adicionar lógica para cada tipo de upgrade aqui se quiser
                    // Exemplo: aumentar dano, velocidade, vida etc.
                } else {
                    this.upgradeText.setText(`Dinheiro insuficiente`);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                }
            }
        });
    }

    checkUpgradeAreaOverlap() {
        let inArea = false;

        for (const area of this.upgradeAreas) {
            const boundsA = this.player.getBounds();
            const boundsB = area.getBounds();

            if (Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB)) {
                inArea = true;
                this.currentUpgradeArea = area;

                this.upgradeText.setText(area.message);
                this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                this.upgradeText.setVisible(true);
                break;
            }
        }

        if (!inArea) {
            this.currentUpgradeArea = null;
            this.upgradeText.setVisible(false);
        }
    }

    addPerkIcon(perkKey) {
        const iconKey = {
            forca: 'perk_forca',
            reviver: 'perk_reviver',
            resistencia: 'perk_resistencia',
            recarga: 'perk_recarga'
        }[perkKey];

        if (!iconKey) return;

        const iconX = this.perkIconStartX + this.perkIcons.length * 40;
        const icon = this.add.image(iconX, this.perkIconStartY, iconKey)
            .setScrollFactor(0)
            .setDisplaySize(32, 32);

        this.perkIcons.push(icon);
    }
}