import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables();
  return tables.map(String).includes(tableName);
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const [saleReturnIndexes, userIndexes] = await Promise.all([
      queryInterface.showIndex('sale_returns'),
      queryInterface.showIndex('users'),
    ]);

    const saleReturnsHasPrimaryKey = (saleReturnIndexes as any[]).some((index: any) => index.primary);
    const usersHasPrimaryKey = (userIndexes as any[]).some((index: any) => index.primary);

    if (!(await tableExists(queryInterface, 'return_tickets'))) {
      await queryInterface.createTable('return_tickets', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        ticketNumber: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        saleReturnId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          ...(saleReturnsHasPrimaryKey
            ? {
                references: {
                  model: 'sale_returns',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        status: {
          type: DataTypes.ENUM(
            'OPEN',
            'IN_DISCUSSION',
            'DECISION_FINALIZED',
            'WAITING_TCP_EXECUTION',
            'TCP_EXECUTING',
            'COMPLETED',
            'REJECTED',
            'OVERDUE'
          ),
          allowNull: false,
          defaultValue: 'OPEN',
        },
        deadlineAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        finalDecision: {
          type: DataTypes.ENUM('RESEND_UNIT', 'SEND_COMPONENT', 'RESTOCK'),
          allowNull: true,
        },
        finalDecisionNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        finalizedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        finalizedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        tcpExecutorId: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        tcpStartedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        tcpCompletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resolvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('return_tickets', ['saleReturnId']);
      await queryInterface.addIndex('return_tickets', ['createdBy']);
      await queryInterface.addIndex('return_tickets', ['status']);
      await queryInterface.addIndex('return_tickets', ['deadlineAt']);
      await queryInterface.addIndex('return_tickets', ['finalizedBy']);
      await queryInterface.addIndex('return_tickets', ['tcpExecutorId']);
    }

    if (!(await tableExists(queryInterface, 'return_ticket_participants'))) {
      await queryInterface.createTable('return_ticket_participants', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        ticketId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'return_tickets',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        roleSnapshot: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('return_ticket_participants', ['ticketId']);
      await queryInterface.addIndex('return_ticket_participants', ['userId']);
      await queryInterface.addIndex('return_ticket_participants', ['ticketId', 'userId'], { unique: true });
    }

    if (!(await tableExists(queryInterface, 'return_ticket_messages'))) {
      await queryInterface.createTable('return_ticket_messages', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        ticketId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'return_tickets',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        senderId: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        messageType: {
          type: DataTypes.ENUM('TEXT', 'SYSTEM', 'DECISION'),
          allowNull: false,
          defaultValue: 'TEXT',
        },
        attachmentUrl: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('return_ticket_messages', ['ticketId']);
      await queryInterface.addIndex('return_ticket_messages', ['senderId']);
      await queryInterface.addIndex('return_ticket_messages', ['createdAt']);
    }

    if (!(await tableExists(queryInterface, 'return_executions'))) {
      await queryInterface.createTable('return_executions', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        ticketId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'return_tickets',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        executionType: {
          type: DataTypes.ENUM('RESEND_UNIT', 'SEND_COMPONENT', 'RESTOCK'),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('PENDING', 'STARTED', 'COMPLETED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        shippingService: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        shippingCost: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        expenseAmount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        },
        proofPhotos: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        executedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          ...(usersHasPrimaryKey
            ? {
                references: {
                  model: 'users',
                  key: 'id',
                },
              }
            : {}),
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        executedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('return_executions', ['ticketId']);
      await queryInterface.addIndex('return_executions', ['status']);
      await queryInterface.addIndex('return_executions', ['executedBy']);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, 'return_executions')) {
      await queryInterface.dropTable('return_executions');
    }
    if (await tableExists(queryInterface, 'return_ticket_messages')) {
      await queryInterface.dropTable('return_ticket_messages');
    }
    if (await tableExists(queryInterface, 'return_ticket_participants')) {
      await queryInterface.dropTable('return_ticket_participants');
    }
    if (await tableExists(queryInterface, 'return_tickets')) {
      await queryInterface.dropTable('return_tickets');
    }
  },
};
