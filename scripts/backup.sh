#!/bin/bash
# StoryMind DB backup script
# Run via cron: 0 */6 * * * /path/to/backup.sh

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_PATH="${DB_PATH:-./server/storymind.db}"
MAX_BACKUPS=${MAX_BACKUPS:-30}

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/storymind_${TIMESTAMP}.db"

# SQLite safe backup using .backup command
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

if [ $? -eq 0 ]; then
  # Compress
  gzip "$BACKUP_FILE"
  echo "[Backup] Created: ${BACKUP_FILE}.gz"
  
  # Rotate old backups
  BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/storymind_*.db.gz 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    ls -1t "$BACKUP_DIR"/storymind_*.db.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "[Backup] Rotated, keeping last $MAX_BACKUPS backups"
  fi
else
  echo "[Backup] FAILED" >&2
  exit 1
fi
