#!/bin/bash
echo "Esperando a que MongoDB responda para iniciar Replica Set rs0..."
until mongosh --host mongodb:27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "MongoDB aún no está disponible. Reintentando en 2 segundos..."
  sleep 2
done

echo "Inicializando replica set rs0..."
mongosh --host mongodb:27017 <<EOF
try {
  var status = rs.status();
  print("Replica Set ya se encuentra iniciado con estado: " + status.ok);
} catch (e) {
  print("Iniciando rs.initiate()...");
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "mongodb:27017" }
    ]
  });
  print("Replica Set rs0 inicializado exitosamente.");
}
EOF
