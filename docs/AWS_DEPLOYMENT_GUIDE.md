# ThermalMind: AWS Cloud Deployment & Architecture Guide

This guide documents the procedures for transitioning ThermalMind from **Local Demonstration Mode** to a production **AWS Cloud Architecture**.

---

## 1. Cloud Architecture Overview

```mermaid
flowchart TD
    subgraph Users[Operator Access]
        Browser[Operator Browser] --> Route53[Amazon Route 53]
        Route53 --> CloudFront[Amazon CloudFront CDN]
        CloudFront --> ALB[Application Load Balancer]
    end

    subgraph VPC[Amazon Virtual Private Cloud (VPC)]
        subgraph PublicSubnets[Public Subnets]
            ALB
        end

        subgraph PrivateSubnets[Private Subnets]
            ECS_Backend[Amazon ECS Fargate: ThermalMind API]
            MongoDB_Atlas[(MongoDB Atlas / DocumentDB)]
        end
    end

    subgraph SecurityManagement[Security & Observability]
        SecretsManager[AWS Secrets Manager] --> ECS_Backend
        KMS[AWS KMS Customer Master Key] --> MongoDB_Atlas
        KMS --> S3
        ECS_Backend --> CloudWatch[Amazon CloudWatch Logs & Metrics]
        ECS_Backend --> S3[Amazon S3: Telemetry Archives & Reports]
    end

    ALB --> ECS_Backend
```

---

## 2. Infrastructure Deployment Steps

### Step 1: Amazon S3 Telemetry Bucket
Create an S3 bucket with server-side encryption and lifecycle rules:

```bash
# 1. Create S3 Bucket
aws s3api create-bucket \
    --bucket thermalmind-telemetry-reports \
    --region us-east-1

# 2. Enable Default Server-Side Encryption (KMS or AES256)
aws s3api put-bucket-encryption \
    --bucket thermalmind-telemetry-reports \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms"
            }
        }]
    }'

# 3. Configure 90-Day Glacier Archival Lifecycle
aws s3api put-bucket-lifecycle-configuration \
    --bucket thermalmind-telemetry-reports \
    --lifecycle-configuration '{
        "Rules": [{
            "ID": "ArchiveHistoricalTelemetry",
            "Status": "Enabled",
            "Filter": { "Prefix": "historical/" },
            "Transitions": [{
                "Days": 90,
                "StorageClass": "GLACIER"
            }]
        }]
    }'
```

---

### Step 2: AWS Secrets Manager
Store sensitive application credentials:

```bash
aws secretsmanager create-secret \
    --name /thermalmind/production/credentials \
    --description "Database URI and JWT Secrets for ThermalMind" \
    --secret-string '{
        "MONGODB_URI": "mongodb+srv://thermalmind-admin:<PASSWORD>@cluster.mongodb.net/thermalmind?retryWrites=true&w=majority",
        "JWT_SECRET": "ENTER_HIGH_ENTROPY_RANDOM_SECRET_KEY_HERE_2026"
    }'
```

---

### Step 3: Amazon ECS Fargate Task Definition
Define the containerized backend deployment:

```json
{
  "family": "thermalmind-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ThermalMindECSExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ThermalMindECSTaskRole",
  "containerDefinitions": [
    {
      "name": "thermalmind-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/thermalmind-backend:v1.0",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5000,
          "hostPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "5000" },
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "AWS_S3_BUCKET", "value": "thermalmind-telemetry-reports" },
        { "name": "AWS_CLOUDWATCH_GROUP", "value": "/thermalmind/datacenter-cooling" }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:/thermalmind/production/credentials:MONGODB_URI::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:/thermalmind/production/credentials:JWT_SECRET::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/thermalmind/datacenter-cooling",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

### Step 4: Amazon CloudWatch Alarms
Configure proactive metric alerts for thermal escalation:

```bash
aws cloudwatch put-metric-alarm \
    --alarm-name "ThermalMind-CriticalHotspotAlarm" \
    --metric-name "PeakRackTemperature" \
    --namespace "ThermalMind/DataCenter" \
    --statistic "Maximum" \
    --period 60 \
    --threshold 38.0 \
    --comparison-operator "GreaterThanOrEqualToThreshold" \
    --evaluation-periods 1 \
    --alarm-actions "arn:aws:sns:us-east-1:ACCOUNT_ID:thermalmind-ops-alerts"
```

---

## 3. Local Mode vs. AWS Connected Mode

| Dimension | Local Mode (Default) | AWS Connected Mode |
| :--- | :--- | :--- |
| **Credentials Needed** | None | AWS IAM Access Keys or ECS Task Role |
| **Database** | Embedded MongoMemoryServer or local Mongo | MongoDB Atlas or AWS DocumentDB |
| **Telemetry Archival** | Local CSV and JSON volumes | Amazon S3 with Glacier tiering |
| **Observability** | Local structured logs and in-memory metrics | Amazon CloudWatch Logs and Alarms |
| **Key Management** | Local standard encryption | AWS KMS Customer Managed Key |
| **Cloud Operations Page** | Displays `Local Mode — AWS Not Configured` | Displays `AWS Cloud Connected` |
