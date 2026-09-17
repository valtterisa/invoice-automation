output "aws_region" {
  value = var.aws_region
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "security_group_id" {
  value = aws_security_group.app.id
}

output "ec2_instance_id" {
  value = aws_instance.app.id
}

output "ec2_public_ip" {
  value = aws_instance.app.public_ip
}

output "ec2_public_dns" {
  value = aws_instance.app.public_dns
}

output "invoice_bucket_name" {
  value = aws_s3_bucket.invoices.id
}

output "invoice_bucket_arn" {
  value = aws_s3_bucket.invoices.arn
}

output "instance_role_arn" {
  value = aws_iam_role.ec2.arn
}

output "ssh_hint" {
  value = "ssh -i <key.pem> ec2-user@${aws_instance.app.public_ip}"
}
