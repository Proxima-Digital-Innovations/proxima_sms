import * as React from 'react';
import {
  Html,
  Body,
  Head,
  Heading,
  Hr,
  Container,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BroadcastEmailProps {
  schoolName: string;
  subject: string;
  body: string;
  primaryColor?: string;
}

export const BroadcastEmail = ({
  schoolName,
  subject,
  body,
  primaryColor = '#0f172a',
}: BroadcastEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: primaryColor }}>
            <Heading style={headerTitle}>{schoolName}</Heading>
          </Section>
          
          <Section style={content}>
            <Heading as="h2" style={title}>
              {subject}
            </Heading>
            
            {body.split('\n').map((paragraph, i) => (
              <Text key={i} style={text}>
                {paragraph}
              </Text>
            ))}
            
            <Hr style={hr} />
            <Text style={footer}>
              This is an automated message from {schoolName}. Please do not reply directly to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BroadcastEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const headerTitle = {
  color: '#ffffff',
  margin: '0',
  fontSize: '24px',
  fontWeight: 'bold',
};

const content = {
  padding: '24px',
};

const title = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '24px',
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0 24px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
  textAlign: 'center' as const,
};
