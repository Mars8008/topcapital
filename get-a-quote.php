<?php

$to = "contact@designesia.com";
$subject = "New Renovation Quote Request";

// Collect form data
$name         = $_POST['name'] ?? '';
$email        = $_POST['email'] ?? '';
$phone        = $_POST['phone'] ?? '';
$company      = $_POST['company'] ?? '';
$project      = $_POST['project_description'] ?? '';
$type         = $_POST['project_type'] ?? '';
$size         = $_POST['property_size'] ?? '';
$budget       = $_POST['budget'] ?? '';
$timeline     = $_POST['timeline'] ?? '';
$style        = $_POST['style'] ?? '';
$start_date   = $_POST['start_date'] ?? '';
$address      = $_POST['address'] ?? '';
$requirements = $_POST['requirements'] ?? '';

// Email body
$message = '
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>New Renovation Quote Request</title>
</head>
<body>

<h2>New Renovation Quote Request</h2>

<table border="1" cellpadding="8" cellspacing="0">

<tr>
    <th align="left">Name</th>
    <td>' . htmlspecialchars($name) . '</td>
</tr>

<tr>
    <th align="left">Email</th>
    <td>' . htmlspecialchars($email) . '</td>
</tr>

<tr>
    <th align="left">Phone</th>
    <td>' . htmlspecialchars($phone) . '</td>
</tr>

<tr>
    <th align="left">Company</th>
    <td>' . htmlspecialchars($company) . '</td>
</tr>

<tr>
    <th align="left">Project Description</th>
    <td>' . nl2br(htmlspecialchars($project)) . '</td>
</tr>

<tr>
    <th align="left">Project Type</th>
    <td>' . htmlspecialchars($type) . '</td>
</tr>

<tr>
    <th align="left">Property Size</th>
    <td>' . htmlspecialchars($size) . '</td>
</tr>

<tr>
    <th align="left">Estimated Budget</th>
    <td>' . htmlspecialchars($budget) . '</td>
</tr>

<tr>
    <th align="left">Project Timeline</th>
    <td>' . htmlspecialchars($timeline) . '</td>
</tr>

<tr>
    <th align="left">Preferred Style</th>
    <td>' . htmlspecialchars($style) . '</td>
</tr>

<tr>
    <th align="left">Preferred Start Date</th>
    <td>' . htmlspecialchars($start_date) . '</td>
</tr>

<tr>
    <th align="left">Project Address</th>
    <td>' . htmlspecialchars($address) . '</td>
</tr>

<tr>
    <th align="left">Special Requirements</th>
    <td>' . nl2br(htmlspecialchars($requirements)) . '</td>
</tr>

</table>

</body>
</html>
';

// Email headers
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: Renovast Website <contact@designesia.com>\r\n";
$headers .= "Reply-To: " . $name . " <" . $email . ">\r\n";

// Send email
if (mail($to, $subject, $message, $headers)) {
    echo "sent";
} else {
    echo "failed";
}

?>