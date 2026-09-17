variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "project_name" {
  type    = string
  default = "invoice-agent"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.20.1.0/24"
}

variable "availability_zone" {
  type    = string
  default = ""
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "key_name" {
  description = "Existing EC2 key pair name"
  type        = string
}

variable "ssh_cidr_blocks" {
  description = "CIDRs allowed on port 22"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ami_id" {
  description = "AMI override; empty = latest Amazon Linux 2023"
  type        = string
  default     = ""
}

variable "root_volume_size_gb" {
  type    = number
  default = 30
}

variable "invoice_bucket_name" {
  description = "Explicit bucket name; empty = auto-generate"
  type        = string
  default     = ""
}
