<?php
declare(strict_types=1);

// Standalone: loads CI4's environment parser only, never boots controllers/sessions/services.
$stage = 'READ_CONFIGURATION';
$db = null;
try {
    $root = getenv('LUNA_AUDIT_WEBSITE_ROOT');
    if (!is_string($root) || !is_dir($root)) throw new RuntimeException('INVALID_WEBSITE_ROOT');
    require_once $root . '/vendor/codeigniter4/framework/system/Config/DotEnv.php';
    (new \CodeIgniter\Config\DotEnv($root))->load();
    $value = static function (string $key, string $default = ''): string {
        $result = getenv('database.default.' . $key);
        return $result === false ? $default : (string)$result;
    };
    if ($value('DSN') !== '' || $value('DBPrefix') !== '' || $value('DBDriver', 'MySQLi') !== 'MySQLi') {
        throw new RuntimeException('UNSUPPORTED_WEBSITE_CONNECTION');
    }
    if ($value('database') === '' || $value('username') === '') throw new RuntimeException('MISSING_WEBSITE_CONNECTION');
    $stage = 'CONNECT_MYSQLI';
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = mysqli_init();
    $db->options(MYSQLI_OPT_CONNECT_TIMEOUT, 10);
    $db->real_connect($value('hostname', 'localhost'), $value('username'), $value('password'), $value('database'), (int)$value('port', '3306'));
    $db->set_charset('utf8mb4');
    $stage = 'SELECT_SNAPSHOT';
    $db->query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $db->query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    $select = static function (mysqli $connection, string $sql, string $types = '', array $parameters = []): array {
        if (!preg_match('/^SELECT\s/i', $sql) || preg_match('/\b(?:INTO|FOR\s+UPDATE|GET_LOCK|RELEASE_LOCK|SLEEP|BENCHMARK)\b/i', $sql)) {
            throw new RuntimeException('QUERY_NOT_READ_ONLY');
        }
        $statement = $connection->prepare($sql);
        if ($types !== '') $statement->bind_param($types, ...$parameters);
        $statement->execute();
        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
        $statement->close();
        return $rows;
    };
    $prefix = 'luna_product_identity_';
    $data = [
        'context' => $select($db, "SELECT DATABASE() AS database_name, VERSION() AS server_version, DATE_FORMAT(UTC_TIMESTAMP(6), '%Y-%m-%dT%H:%i:%s.%fZ') AS observed_at, @@session.time_zone AS session_time_zone, @@system_time_zone AS server_system_time_zone"),
        'schema' => $select($db, 'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = ? AND COLUMN_NAME = ?) OR (TABLE_NAME = ? AND COLUMN_NAME = ?)) ORDER BY TABLE_NAME, COLUMN_NAME', 'ssss', ['konstanta', 'value', 'stok', 'nama']),
        'products' => $select($db, 'SELECT id, nama, active, varian, shopee, tokped, tiktok FROM barang ORDER BY id'),
        'identities' => $select($db, 'SELECT label, value FROM konstanta WHERE LEFT(label, ?) = ? ORDER BY id', 'is', [strlen($prefix), $prefix]),
        'orders' => $select($db, 'SELECT id_midtrans, status, items, data_mid FROM pemesanan WHERE id_midtrans = ? ORDER BY id', 's', ['L00000227']),
    ];
    // Raw result is consumed by the parent audit process, never echoed directly to Actions logs.
    echo 'LUNA_WEBSITE_EVIDENCE_JSON=' . json_encode($data, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE) . PHP_EOL;
} catch (Throwable $error) {
    $known = ['INVALID_WEBSITE_ROOT', 'UNSUPPORTED_WEBSITE_CONNECTION', 'MISSING_WEBSITE_CONNECTION', 'QUERY_NOT_READ_ONLY'];
    $reason = in_array($error->getMessage(), $known, true) ? $error->getMessage() : 'PHP_DATABASE_INSPECTION_FAILED';
    fwrite(STDERR, json_encode(['website_audit_stage' => $stage, 'reason' => $reason, 'error_code' => (int)$error->getCode()]) . PHP_EOL);
    $failed = true;
} finally {
    if ($db instanceof mysqli) {
        try { $db->rollback(); } catch (Throwable $ignored) {}
        try { $db->close(); } catch (Throwable $ignored) {}
    }
}
if (isset($failed)) exit(1);
